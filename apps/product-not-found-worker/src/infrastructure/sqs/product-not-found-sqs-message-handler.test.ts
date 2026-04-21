import { describe, expect, it } from "vitest";
import {
  RecordProductNotFoundCommand,
  type EventIdempotencyInput,
  type EventIdempotencyRepository,
  type ProductNotFoundRecord,
  type ProductNotFoundRepository,
} from "@labellens/application";
import { HandleProductNotFoundMessageCommand } from "../../application/handle-product-not-found-message-command.js";
import { ProductNotFoundSqsMessageHandler } from "./product-not-found-sqs-message-handler.js";

class RecordingProductNotFoundRepository implements ProductNotFoundRepository {
  readonly records: ProductNotFoundRecord[] = [];

  async save(record: ProductNotFoundRecord): Promise<void> {
    this.records.push(record);
  }
}

class AllowingEventIdempotencyRepository implements EventIdempotencyRepository {
  async tryMarkProcessed(_event: EventIdempotencyInput): Promise<boolean> {
    return true;
  }
}

function createHandler(repository: ProductNotFoundRepository): ProductNotFoundSqsMessageHandler {
  return new ProductNotFoundSqsMessageHandler(
    new HandleProductNotFoundMessageCommand(
      new RecordProductNotFoundCommand(repository),
      new AllowingEventIdempotencyRepository(),
    ),
  );
}

describe("ProductNotFoundSqsMessageHandler", () => {
  it("parses SQS messages and delegates product.not_found.v1 events to the application command", async () => {
    const repository = new RecordingProductNotFoundRepository();
    const handler = createHandler(repository);

    await handler.handle({
      Body: JSON.stringify({
        eventId: "evt-1",
        eventType: "product.not_found.v1",
        eventVersion: 1,
        occurredAt: "2026-04-21T00:00:00.000Z",
        correlationId: "corr-1",
        producer: "product-service",
        payload: {
          barcode: "99999999999999",
          source: "OPEN_FOOD_FACTS",
          sourceMode: "fixture",
          reason: "OFF_NOT_FOUND",
          requestPath: "/api/v1/products/barcode/{barcode}",
        },
      }),
    });

    expect(repository.records).toHaveLength(1);
    expect(repository.records[0]).toMatchObject({
      eventId: "evt-1",
      barcode: "99999999999999",
      source: "OPEN_FOOD_FACTS",
      sourceMode: "fixture",
      correlationId: "corr-1",
    });
  });

  it("rejects unsupported event types before reaching the application command", async () => {
    const repository = new RecordingProductNotFoundRepository();
    const handler = createHandler(repository);

    await expect(
      handler.handle({
        Body: JSON.stringify({
          eventId: "evt-2",
          eventType: "menu.saved.v1",
          eventVersion: 1,
          occurredAt: "2026-04-21T00:00:00.000Z",
          correlationId: "corr-2",
          producer: "menu-service",
          payload: {},
        }),
      }),
    ).rejects.toThrow("Unsupported event type");

    expect(repository.records).toHaveLength(0);
  });
});
