import { describe, expect, it } from "vitest";
import {
  RecordProductNotFoundCommand,
  type EventIdempotencyInput,
  type EventIdempotencyRepository,
  type ProductNotFoundEvent,
  type ProductNotFoundRecord,
  type ProductNotFoundRepository,
} from "@labellens/application";
import { HandleProductNotFoundMessageCommand } from "./handle-product-not-found-message-command.js";

class RecordingProductNotFoundRepository implements ProductNotFoundRepository {
  readonly records: ProductNotFoundRecord[] = [];

  async save(record: ProductNotFoundRecord): Promise<void> {
    this.records.push(record);
  }
}

class StubEventIdempotencyRepository implements EventIdempotencyRepository {
  readonly events: EventIdempotencyInput[] = [];

  constructor(private readonly shouldProcess: boolean = true) {}

  async tryMarkProcessed(event: EventIdempotencyInput): Promise<boolean> {
    this.events.push(event);
    return this.shouldProcess;
  }
}

function createProductNotFoundEvent(): ProductNotFoundEvent {
  return {
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
  };
}

describe("HandleProductNotFoundMessageCommand", () => {
  it("records product.not_found.v1 events once idempotency is reserved", async () => {
    const repository = new RecordingProductNotFoundRepository();
    const idempotencyRepository = new StubEventIdempotencyRepository();
    const command = new HandleProductNotFoundMessageCommand(
      new RecordProductNotFoundCommand(repository),
      idempotencyRepository,
    );

    await command.execute(createProductNotFoundEvent());

    expect(idempotencyRepository.events).toHaveLength(1);
    expect(repository.records).toHaveLength(1);
    expect(repository.records[0]).toMatchObject({
      eventId: "evt-1",
      barcode: "99999999999999",
      source: "OPEN_FOOD_FACTS",
      sourceMode: "fixture",
      reason: "OFF_NOT_FOUND",
      correlationId: "corr-1",
      occurredAt: "2026-04-21T00:00:00.000Z",
    });
  });

  it("does not repeat side effects for duplicate events", async () => {
    const repository = new RecordingProductNotFoundRepository();
    const command = new HandleProductNotFoundMessageCommand(
      new RecordProductNotFoundCommand(repository),
      new StubEventIdempotencyRepository(false),
    );

    await command.execute(createProductNotFoundEvent());

    expect(repository.records).toHaveLength(0);
  });
});
