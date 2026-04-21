import { describe, expect, it } from "vitest";
import type { AnalyticsEvent, AnalyticsEventRecord, AnalyticsEventRepository } from "@labellens/application";
import { RecordAnalyticsEventCommand } from "@labellens/application";
import { HandleAnalyticsEventCommand } from "./handle-analytics-event-command.js";

class RecordingAnalyticsEventRepository implements AnalyticsEventRepository {
  readonly records: AnalyticsEventRecord[] = [];

  async save(record: AnalyticsEventRecord): Promise<void> {
    this.records.push(record);
  }
}

function createMenuSavedEvent(): AnalyticsEvent {
  return {
    eventId: "evt-analytics-1",
    eventType: "menu.saved.v1",
    occurredAt: "2026-04-21T00:00:00.000Z",
    correlationId: "corr-analytics-1",
    payload: {
      ownerId: "demo-user",
      menuId: "menu-1",
      mealCount: 4,
      itemCount: 1,
    },
  };
}

describe("HandleAnalyticsEventCommand", () => {
  it("records analytics events", async () => {
    const repository = new RecordingAnalyticsEventRepository();
    const command = new HandleAnalyticsEventCommand(new RecordAnalyticsEventCommand(repository));

    await command.execute(createMenuSavedEvent());

    expect(repository.records).toHaveLength(1);
    expect(repository.records[0]).toMatchObject({
      eventId: "evt-analytics-1",
      eventType: "menu.saved.v1",
      correlationId: "corr-analytics-1",
    });
  });
});
