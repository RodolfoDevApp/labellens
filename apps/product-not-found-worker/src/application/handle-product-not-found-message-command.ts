import type { Message } from "@aws-sdk/client-sqs";
import { RecordProductNotFoundCommand, type ProductNotFoundEvent } from "@labellens/application";
import { parseLabelLensEvent } from "@labellens/infrastructure";

export class HandleProductNotFoundMessageCommand {
  constructor(private readonly recordProductNotFound: RecordProductNotFoundCommand) {}

  async execute(message: Message): Promise<void> {
    const event = parseLabelLensEvent(message.Body);

    if (event.eventType !== "product.not_found.v1") {
      throw new Error(`Unsupported event type for product-not-found-worker: ${event.eventType}.`);
    }

    await this.recordProductNotFound.execute(event as ProductNotFoundEvent);
  }
}
