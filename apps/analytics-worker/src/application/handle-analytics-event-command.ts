import {
  RecordAnalyticsEventCommand,
  type AnalyticsEvent,
  type EventIdempotencyRepository,
} from "@labellens/application";

export class HandleAnalyticsEventCommand {
  constructor(
    private readonly recordAnalyticsEvent: RecordAnalyticsEventCommand,
    private readonly idempotencyRepository: EventIdempotencyRepository,
  ) {}

  async execute(event: AnalyticsEvent): Promise<void> {
    const shouldProcess = await this.idempotencyRepository.tryMarkProcessed(event);

    if (!shouldProcess) {
      return;
    }

    await this.recordAnalyticsEvent.execute(event);
  }
}
