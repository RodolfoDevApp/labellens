import type { EventIdempotencyRepository, FoodCacheRefreshRequestedEvent } from "@labellens/application";
import type { FoodCacheRefreshClient } from "../infrastructure/http/food-cache-refresh-client.js";

export class HandleFoodCacheRefreshMessageCommand {
  constructor(
    private readonly client: FoodCacheRefreshClient,
    private readonly idempotencyRepository: EventIdempotencyRepository,
  ) {}

  async execute(event: FoodCacheRefreshRequestedEvent): Promise<void> {
    const shouldProcess = await this.idempotencyRepository.tryMarkProcessed(event);

    if (!shouldProcess) {
      return;
    }

    await this.client.refresh({
      correlationId: event.correlationId,
      limit: event.payload.limit,
      scheduledFor: event.payload.scheduledFor,
    });
  }
}
