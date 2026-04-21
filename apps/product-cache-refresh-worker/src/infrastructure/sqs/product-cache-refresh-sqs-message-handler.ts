import type { Message } from "@aws-sdk/client-sqs";
import type { ProductCacheRefreshRequestedEvent } from "@labellens/application";
import { parseLabelLensEvent } from "@labellens/infrastructure";
import type { HandleProductCacheRefreshMessageCommand } from "../../application/handle-product-cache-refresh-message-command.js";

export class ProductCacheRefreshSqsMessageHandler {
  constructor(private readonly command: HandleProductCacheRefreshMessageCommand) {}

  async handle(message: Message): Promise<void> {
    const event = parseLabelLensEvent(message.Body);

    if (event.eventType !== "cache.refresh.product.requested.v1") {
      throw new Error(`Unsupported event type for product-cache-refresh-worker: ${event.eventType}.`);
    }

    await this.command.execute(event as ProductCacheRefreshRequestedEvent);
  }
}
