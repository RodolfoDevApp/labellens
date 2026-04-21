import { describe, expect, it } from "vitest";
import type { AnalyticsEvent, AnalyticsEventRecord, AnalyticsEventRepository, EventIdempotencyInput, EventIdempotencyRepository } from "@labellens/application";
import { RecordAnalyticsEventCommand } from "@labellens/application";
import { HandleAnalyticsEventCommand } from "./handle-analytics-event-command.js";

class RecordingAnalyticsEventRepository implements AnalyticsEventRepository {
  readonly records: AnalyticsEventRecord[] = [];

  async save(record: AnalyticsEventRecord): Promise<void> {
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

function createMenuSavedEvent(): AnalyticsEvent {
  return {
    eventId: "evt-analytics-1",
    eventType: "menu.saved.v1",
    eventVersion: 1,
    occurredAt: "2026-04-21T00:00:00.000Z",
    correlationId: "corr-analytics-1",
    producer: "menu-service",
    payload: {
      ownerIdHash: "hash-demo-user",
      menuId: "menu-1",
      mealCount: 4,
      itemCount: 1,
    },
  };
}

describe("HandleAnalyticsEventCommand", () => {
  it("records analytics events once idempotency is reserved", async () => {
    const repository = new RecordingAnalyticsEventRepository();
    const idempotencyRepository = new StubEventIdempotencyRepository();
    const command = new HandleAnalyticsEventCommand(
      new RecordAnalyticsEventCommand(repository),
      idempotencyRepository,
    );

    await command.execute(createMenuSavedEvent());

    expect(idempotencyRepository.events).toHaveLength(1);
    expect(repository.records).toHaveLength(1);
    expect(repository.records[0]).toMatchObject({
      eventId: "evt-analytics-1",
      eventType: "menu.saved.v1",
      eventVersion: 1,
      producer: "menu-service",
      correlationId: "corr-analytics-1",
    });
  });

  it("does not repeat side effects for duplicate events", async () => {
    const repository = new RecordingAnalyticsEventRepository();
    const command = new HandleAnalyticsEventCommand(
      new RecordAnalyticsEventCommand(repository),
      new StubEventIdempotencyRepository(false),
    );

    await command.execute(createMenuSavedEvent());

    expect(repository.records).toHaveLength(0);
  });
});
