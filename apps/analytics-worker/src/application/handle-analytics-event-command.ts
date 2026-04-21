import { RecordAnalyticsEventCommand, type AnalyticsEvent } from "@labellens/application";

export class HandleAnalyticsEventCommand {
  constructor(private readonly recordAnalyticsEvent: RecordAnalyticsEventCommand) {}

  async execute(event: AnalyticsEvent): Promise<void> {
    await this.recordAnalyticsEvent.execute(event);
  }
}
