import type { Message } from "@aws-sdk/client-sqs";
import type { AnalyticsEvent } from "@labellens/application";
import { parseLabelLensEvent } from "@labellens/infrastructure";
import type { HandleAnalyticsEventCommand } from "../../application/handle-analytics-event-command.js";

const ANALYTICS_EVENT_TYPES = new Set([
  "food.searched.v1",
  "product.scanned.v1",
  "menu.saved.v1",
  "favorite.saved.v1",
]);

export class AnalyticsSqsMessageHandler {
  constructor(private readonly command: HandleAnalyticsEventCommand) {}

  async handle(message: Message): Promise<void> {
    const event = parseLabelLensEvent(message.Body);

    if (!ANALYTICS_EVENT_TYPES.has(event.eventType)) {
      throw new Error(`Unsupported event type for analytics-worker: ${event.eventType}.`);
    }

    await this.command.execute(event as AnalyticsEvent);
  }
}
