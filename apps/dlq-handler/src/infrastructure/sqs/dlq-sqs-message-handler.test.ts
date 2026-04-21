import { describe, expect, it } from "vitest";
import type { DlqMessageRecord, DlqMessageRepository } from "@labellens/application";
import { RecordDlqMessageCommand } from "@labellens/application";
import { HandleDlqMessageCommand } from "../../application/handle-dlq-message-command.js";
import { DlqSqsMessageHandler } from "./dlq-sqs-message-handler.js";

class RecordingDlqMessageRepository implements DlqMessageRepository {
  readonly records: DlqMessageRecord[] = [];

  async save(record: DlqMessageRecord): Promise<void> {
    this.records.push(record);
  }
}

describe("DlqSqsMessageHandler", () => {
  it("delegates DLQ messages to the application command", async () => {
    const repository = new RecordingDlqMessageRepository();
    const handler = new DlqSqsMessageHandler(
      "product-not-found",
      new HandleDlqMessageCommand(new RecordDlqMessageCommand(repository)),
    );

    await handler.handle({
      MessageId: "dlq-message-1",
      Body: JSON.stringify({
        eventId: "evt-product-not-found-1",
        eventType: "product.not_found.v1",
        eventVersion: 1,
        occurredAt: "2026-04-21T00:00:00.000Z",
        correlationId: "corr-product-not-found-1",
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
      sourceQueueName: "product-not-found",
      eventType: "product.not_found.v1",
      correlationId: "corr-product-not-found-1",
    });
  });
});
