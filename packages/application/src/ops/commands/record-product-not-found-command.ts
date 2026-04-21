import type { ProductNotFoundEvent } from "../../events/product-not-found-event.js";
import type { ProductNotFoundRepository } from "../../ports/product-not-found-repository.js";

export class RecordProductNotFoundCommand {
  constructor(private readonly repository: ProductNotFoundRepository) {}

  async execute(event: ProductNotFoundEvent): Promise<void> {
    await this.repository.save({
      eventId: event.eventId,
      barcode: event.payload.barcode,
      source: event.payload.source,
      correlationId: event.correlationId,
      occurredAt: event.occurredAt,
      recordedAt: new Date().toISOString(),
    });
  }
}
