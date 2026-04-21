import type { Message } from "@aws-sdk/client-sqs";
import type { FoodCacheRefreshRequestedEvent } from "@labellens/application";
import { parseLabelLensEvent } from "@labellens/infrastructure";
import type { HandleFoodCacheRefreshMessageCommand } from "../../application/handle-food-cache-refresh-message-command.js";

export class FoodCacheRefreshSqsMessageHandler {
  constructor(private readonly command: HandleFoodCacheRefreshMessageCommand) {}

  async handle(message: Message): Promise<void> {
    const event = parseLabelLensEvent(message.Body);

    if (event.eventType !== "cache.refresh.food.requested.v1") {
      throw new Error(`Unsupported event type for food-cache-refresh-worker: ${event.eventType}.`);
    }

    await this.command.execute(event as FoodCacheRefreshRequestedEvent);
  }
}
