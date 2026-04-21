import { describe, expect, it } from "vitest";
import type { EventIdempotencyInput, EventIdempotencyRepository } from "@labellens/application";
import { HandleProductCacheRefreshMessageCommand } from "../../application/handle-product-cache-refresh-message-command.js";
import type { ProductCacheRefreshClient, ProductCacheRefreshRequest } from "../http/product-cache-refresh-client.js";
import { ProductCacheRefreshSqsMessageHandler } from "./product-cache-refresh-sqs-message-handler.js";

class RecordingProductCacheRefreshClient implements ProductCacheRefreshClient {
  readonly requests: ProductCacheRefreshRequest[] = [];

  async refresh(request: ProductCacheRefreshRequest): Promise<void> {
    this.requests.push(request);
  }
}

class AllowingEventIdempotencyRepository implements EventIdempotencyRepository {
  async tryMarkProcessed(_event: EventIdempotencyInput): Promise<boolean> {
    return true;
  }
}

function createHandler(client: RecordingProductCacheRefreshClient): ProductCacheRefreshSqsMessageHandler {
  return new ProductCacheRefreshSqsMessageHandler(
    new HandleProductCacheRefreshMessageCommand(client, new AllowingEventIdempotencyRepository()),
  );
}

describe("ProductCacheRefreshSqsMessageHandler", () => {
  it("parses SQS messages and delegates product cache refresh events", async () => {
    const client = new RecordingProductCacheRefreshClient();
    const handler = createHandler(client);

    await handler.handle({
      Body: JSON.stringify({
        eventId: "evt-product-refresh-1",
        eventType: "cache.refresh.product.requested.v1",
        eventVersion: 1,
        occurredAt: "2026-04-21T00:00:00.000Z",
        correlationId: "corr-product-refresh-1",
        producer: "eventbridge-scheduler",
        payload: {
          target: "product",
          scheduledFor: "2026-04-21",
          limit: 25,
        },
      }),
    });

    expect(client.requests).toHaveLength(1);
    expect(client.requests[0]).toMatchObject({ limit: 25, scheduledFor: "2026-04-21" });
  });

  it("rejects non-product-refresh events", async () => {
    const client = new RecordingProductCacheRefreshClient();
    const handler = createHandler(client);

    await expect(
      handler.handle({
        Body: JSON.stringify({
          eventId: "evt-food-refresh-1",
          eventType: "cache.refresh.food.requested.v1",
          eventVersion: 1,
          occurredAt: "2026-04-21T00:00:00.000Z",
          correlationId: "corr-food-refresh-1",
          producer: "eventbridge-scheduler",
          payload: {
            target: "food",
            scheduledFor: "2026-04-21",
            limit: 25,
          },
        }),
      }),
    ).rejects.toThrow("Unsupported event type");
  });
});
