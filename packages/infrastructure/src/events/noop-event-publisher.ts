import type { EventPublisher } from "@labellens/application";

export class NoopEventPublisher implements EventPublisher {
  async publish(): Promise<void> {
    return Promise.resolve();
  }
}
