import type { Message } from "@aws-sdk/client-sqs";
import type { ProductNotFoundEvent } from "@labellens/application";
import { parseLabelLensEvent } from "@labellens/infrastructure";
import type { HandleProductNotFoundMessageCommand } from "../../application/handle-product-not-found-message-command.js";

export class ProductNotFoundSqsMessageHandler {
  constructor(private readonly command: HandleProductNotFoundMessageCommand) {}

  async handle(message: Message): Promise<void> {
    const event = parseLabelLensEvent(message.Body);

    if (event.eventType !== "product.not_found.v1") {
      throw new Error(`Unsupported event type for product-not-found-worker: ${event.eventType}.`);
    }

    await this.command.execute(event as ProductNotFoundEvent);
  }
}
