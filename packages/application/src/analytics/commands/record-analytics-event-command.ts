import type { AnalyticsEvent } from "../../events/analytics-events.js";
import type { AnalyticsEventRepository } from "../../ports/analytics-event-repository.js";

export class RecordAnalyticsEventCommand {
  constructor(private readonly analyticsEventRepository: AnalyticsEventRepository) {}

  async execute(event: AnalyticsEvent): Promise<void> {
    await this.analyticsEventRepository.save({
      eventId: event.eventId,
      eventType: event.eventType,
      occurredAt: event.occurredAt,
      correlationId: event.correlationId,
      payload: event.payload,
      recordedAt: new Date().toISOString(),
    });
  }
}
