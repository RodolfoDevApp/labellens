import type { EventIdempotencyRepository, ProductCacheRefreshRequestedEvent } from "@labellens/application";
import type { ProductCacheRefreshClient } from "../infrastructure/http/product-cache-refresh-client.js";

export class HandleProductCacheRefreshMessageCommand {
  constructor(
    private readonly client: ProductCacheRefreshClient,
    private readonly idempotencyRepository: EventIdempotencyRepository,
  ) {}

  async execute(event: ProductCacheRefreshRequestedEvent): Promise<void> {
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
