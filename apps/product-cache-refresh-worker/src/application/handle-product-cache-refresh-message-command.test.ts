import { describe, expect, it } from "vitest";
import type { EventIdempotencyInput, EventIdempotencyRepository, ProductCacheRefreshRequestedEvent } from "@labellens/application";
import { HandleProductCacheRefreshMessageCommand } from "./handle-product-cache-refresh-message-command.js";
import type { ProductCacheRefreshClient, ProductCacheRefreshRequest } from "../infrastructure/http/product-cache-refresh-client.js";

class RecordingProductCacheRefreshClient implements ProductCacheRefreshClient {
  readonly requests: ProductCacheRefreshRequest[] = [];

  async refresh(request: ProductCacheRefreshRequest): Promise<void> {
    this.requests.push(request);
  }
}

class ConfigurableEventIdempotencyRepository implements EventIdempotencyRepository {
  constructor(private readonly shouldProcess: boolean) {}

  async tryMarkProcessed(_event: EventIdempotencyInput): Promise<boolean> {
    return this.shouldProcess;
  }
}

function createEvent(): ProductCacheRefreshRequestedEvent {
  return {
    eventId: "evt-product-refresh-1",
    eventType: "cache.refresh.product.requested.v1",
    eventVersion: 1,
    occurredAt: "2026-04-21T00:00:00.000Z",
    correlationId: "corr-product-refresh-1",
    producer: "eventbridge-scheduler",
    payload: {
      target: "product",
      scheduledFor: "2026-04-21",
      limit: 50,
    },
  };
}

describe("HandleProductCacheRefreshMessageCommand", () => {
  it("refreshes product cache when the event has not been processed", async () => {
    const client = new RecordingProductCacheRefreshClient();
    const command = new HandleProductCacheRefreshMessageCommand(
      client,
      new ConfigurableEventIdempotencyRepository(true),
    );

    await command.execute(createEvent());

    expect(client.requests).toEqual([
      {
        correlationId: "corr-product-refresh-1",
        limit: 50,
        scheduledFor: "2026-04-21",
      },
    ]);
  });

  it("does not refresh duplicated events", async () => {
    const client = new RecordingProductCacheRefreshClient();
    const command = new HandleProductCacheRefreshMessageCommand(
      client,
      new ConfigurableEventIdempotencyRepository(false),
    );

    await command.execute(createEvent());

    expect(client.requests).toHaveLength(0);
  });
});
