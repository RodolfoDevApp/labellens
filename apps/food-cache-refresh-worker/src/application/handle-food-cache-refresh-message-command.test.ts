import { describe, expect, it } from "vitest";
import type { EventIdempotencyInput, EventIdempotencyRepository, FoodCacheRefreshRequestedEvent } from "@labellens/application";
import { HandleFoodCacheRefreshMessageCommand } from "./handle-food-cache-refresh-message-command.js";
import type { FoodCacheRefreshClient, FoodCacheRefreshRequest } from "../infrastructure/http/food-cache-refresh-client.js";

class RecordingFoodCacheRefreshClient implements FoodCacheRefreshClient {
  readonly requests: FoodCacheRefreshRequest[] = [];

  async refresh(request: FoodCacheRefreshRequest): Promise<void> {
    this.requests.push(request);
  }
}

class ConfigurableEventIdempotencyRepository implements EventIdempotencyRepository {
  constructor(private readonly shouldProcess: boolean) {}

  async tryMarkProcessed(_event: EventIdempotencyInput): Promise<boolean> {
    return this.shouldProcess;
  }
}

function createEvent(): FoodCacheRefreshRequestedEvent {
  return {
    eventId: "evt-food-refresh-1",
    eventType: "cache.refresh.food.requested.v1",
    eventVersion: 1,
    occurredAt: "2026-04-21T00:00:00.000Z",
    correlationId: "corr-food-refresh-1",
    producer: "eventbridge-scheduler",
    payload: {
      target: "food",
      scheduledFor: "2026-04-21",
      limit: 50,
    },
  };
}

describe("HandleFoodCacheRefreshMessageCommand", () => {
  it("refreshes food cache when the event has not been processed", async () => {
    const client = new RecordingFoodCacheRefreshClient();
    const command = new HandleFoodCacheRefreshMessageCommand(
      client,
      new ConfigurableEventIdempotencyRepository(true),
    );

    await command.execute(createEvent());

    expect(client.requests).toEqual([
      {
        correlationId: "corr-food-refresh-1",
        limit: 50,
        scheduledFor: "2026-04-21",
      },
    ]);
  });

  it("does not refresh duplicated events", async () => {
    const client = new RecordingFoodCacheRefreshClient();
    const command = new HandleFoodCacheRefreshMessageCommand(
      client,
      new ConfigurableEventIdempotencyRepository(false),
    );

    await command.execute(createEvent());

    expect(client.requests).toHaveLength(0);
  });
});
