import { describe, expect, it } from "vitest";
import type { AnalyticsEventRecord, AnalyticsEventRepository } from "@labellens/application";
import { RecordAnalyticsEventCommand } from "@labellens/application";
import { HandleAnalyticsEventCommand } from "../../application/handle-analytics-event-command.js";
import { AnalyticsSqsMessageHandler } from "./analytics-sqs-message-handler.js";

class RecordingAnalyticsEventRepository implements AnalyticsEventRepository {
  readonly records: AnalyticsEventRecord[] = [];

  async save(record: AnalyticsEventRecord): Promise<void> {
    this.records.push(record);
  }
}

describe("AnalyticsSqsMessageHandler", () => {
  it("parses SQS messages and delegates analytics events to the application command", async () => {
    const repository = new RecordingAnalyticsEventRepository();
    const handler = new AnalyticsSqsMessageHandler(
      new HandleAnalyticsEventCommand(new RecordAnalyticsEventCommand(repository)),
    );

    await handler.handle({
      Body: JSON.stringify({
        eventId: "evt-food-searched-1",
        eventType: "food.searched.v1",
        occurredAt: "2026-04-21T00:00:00.000Z",
        correlationId: "corr-1",
        payload: {
          query: "oats",
          page: 1,
          resultCount: 2,
          source: "USDA",
          sourceMode: "fixture",
        },
      }),
    });

    expect(repository.records).toHaveLength(1);
    expect(repository.records[0]).toMatchObject({
      eventId: "evt-food-searched-1",
      eventType: "food.searched.v1",
      correlationId: "corr-1",
    });
  });

  it("rejects non-analytics event types", async () => {
    const repository = new RecordingAnalyticsEventRepository();
    const handler = new AnalyticsSqsMessageHandler(
      new HandleAnalyticsEventCommand(new RecordAnalyticsEventCommand(repository)),
    );

    await expect(
      handler.handle({
        Body: JSON.stringify({
          eventId: "evt-product-not-found-1",
          eventType: "product.not_found.v1",
          occurredAt: "2026-04-21T00:00:00.000Z",
          correlationId: "corr-1",
          payload: {
            barcode: "99999999999999",
            source: "OPEN_FOOD_FACTS",
          },
        }),
      }),
    ).rejects.toThrow("Unsupported event type");

    expect(repository.records).toHaveLength(0);
  });
});
