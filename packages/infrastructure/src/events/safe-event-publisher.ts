import type { EventPublisher, LabelLensEvent } from "@labellens/application";

export class SafeEventPublisher implements EventPublisher {
  constructor(private readonly inner: EventPublisher) {}

  async publish(event: LabelLensEvent): Promise<void> {
    try {
      await this.inner.publish(event);
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "event.publish.failed",
          eventType: event.eventType,
          eventId: event.eventId,
          correlationId: event.correlationId,
          error: error instanceof Error ? error.message : "Unknown event publish error.",
        }),
      );
    }
  }
}
