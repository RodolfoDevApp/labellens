import { describe, expect, it } from "vitest";
import type { DlqMessageRecord, DlqMessageRepository } from "@labellens/application";
import { RecordDlqMessageCommand } from "@labellens/application";
import { HandleDlqMessageCommand } from "./handle-dlq-message-command.js";

class RecordingDlqMessageRepository implements DlqMessageRepository {
  readonly records: DlqMessageRecord[] = [];

  async save(record: DlqMessageRecord): Promise<void> {
    this.records.push(record);
  }
}

describe("HandleDlqMessageCommand", () => {
  it("records a valid LabelLens event from a DLQ message", async () => {
    const repository = new RecordingDlqMessageRepository();
    const command = new HandleDlqMessageCommand(new RecordDlqMessageCommand(repository));

    await command.execute("analytics", {
      MessageId: "message-1",
      Body: JSON.stringify({
        eventId: "evt-1",
        eventType: "food.searched.v1",
        eventVersion: 1,
        occurredAt: "2026-04-21T00:00:00.000Z",
        correlationId: "corr-1",
        producer: "food-service",
        payload: {
          query: "oats",
          queryUsed: "oats",
          sourceMode: "fixture",
          resultCount: 1,
        },
      }),
    });

    expect(repository.records).toHaveLength(1);
    expect(repository.records[0]).toMatchObject({
      id: "message-1",
      sourceQueueName: "analytics",
      messageId: "message-1",
      eventId: "evt-1",
      eventType: "food.searched.v1",
      correlationId: "corr-1",
      producer: "food-service",
      errorSummary: null,
    });
  });

  it("records an error summary for invalid DLQ payloads without throwing", async () => {
    const repository = new RecordingDlqMessageRepository();
    const command = new HandleDlqMessageCommand(new RecordDlqMessageCommand(repository));

    await command.execute("analytics", {
      MessageId: "message-2",
      Body: "not-json",
    });

    expect(repository.records).toHaveLength(1);
    expect(repository.records[0]?.eventId).toBeNull();
    expect(repository.records[0]?.errorSummary).toContain("Unexpected token");
  });
});
