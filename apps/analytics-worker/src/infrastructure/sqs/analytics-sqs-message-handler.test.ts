import { describe, expect, it } from "vitest";
import type { AnalyticsEventRecord, AnalyticsEventRepository, EventIdempotencyInput, EventIdempotencyRepository } from "@labellens/application";
import { RecordAnalyticsEventCommand } from "@labellens/application";
import { HandleAnalyticsEventCommand } from "../../application/handle-analytics-event-command.js";
import { AnalyticsSqsMessageHandler } from "./analytics-sqs-message-handler.js";

class RecordingAnalyticsEventRepository implements AnalyticsEventRepository {
  readonly records: AnalyticsEventRecord[] = [];

  async save(record: AnalyticsEventRecord): Promise<void> {
    this.records.push(record);
  }
}

class AllowingEventIdempotencyRepository implements EventIdempotencyRepository {
  async tryMarkProcessed(_event: EventIdempotencyInput): Promise<boolean> {
    return true;
  }
}

function createHandler(repository: AnalyticsEventRepository): AnalyticsSqsMessageHandler {
  return new AnalyticsSqsMessageHandler(
    new HandleAnalyticsEventCommand(
      new RecordAnalyticsEventCommand(repository),
      new AllowingEventIdempotencyRepository(),
    ),
  );
}

describe("AnalyticsSqsMessageHandler", () => {
  it("parses SQS messages and delegates analytics events to the application command", async () => {
    const repository = new RecordingAnalyticsEventRepository();
    const handler = createHandler(repository);

    await handler.handle({
      Body: JSON.stringify({
        eventId: "evt-food-searched-1",
        eventType: "food.searched.v1",
        eventVersion: 1,
        occurredAt: "2026-04-21T00:00:00.000Z",
        correlationId: "corr-1",
        producer: "food-service",
        payload: {
          query: "oats",
          queryUsed: "oats",
          resultCount: 2,
          sourceMode: "fixture",
        },
      }),
    });

    expect(repository.records).toHaveLength(1);
    expect(repository.records[0]).toMatchObject({
      eventId: "evt-food-searched-1",
      eventType: "food.searched.v1",
      eventVersion: 1,
      producer: "food-service",
      correlationId: "corr-1",
    });
  });

  it("rejects non-analytics event types", async () => {
    const repository = new RecordingAnalyticsEventRepository();
    const handler = createHandler(repository);

    await expect(
      handler.handle({
        Body: JSON.stringify({
          eventId: "evt-product-not-found-1",
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
      }),
    ).rejects.toThrow("Unsupported event type");

    expect(repository.records).toHaveLength(0);
  });
});
