import type { EventPublisher, LabelLensEvent } from "@labellens/application";

export class NoopEventPublisher implements EventPublisher {
  async publish(_event: LabelLensEvent): Promise<void> {
    // Noop by design. SQS/EventBridge wiring starts in the messaging phase.
  }
}
