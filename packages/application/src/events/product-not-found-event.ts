import { randomUUID } from "node:crypto";
import type { LabelLensEvent } from "../ports/event-publisher.js";

export type ProductNotFoundEventPayload = {
  barcode: string;
  source: "OPEN_FOOD_FACTS";
};

export type ProductNotFoundEvent = LabelLensEvent<ProductNotFoundEventPayload> & {
  eventType: "product.not_found.v1";
};

export function createProductNotFoundEvent(input: {
  barcode: string;
  correlationId: string;
  now?: Date;
  eventId?: string;
}): ProductNotFoundEvent {
  return {
    eventId: input.eventId ?? randomUUID(),
    eventType: "product.not_found.v1",
    occurredAt: (input.now ?? new Date()).toISOString(),
    correlationId: input.correlationId,
    payload: {
      barcode: input.barcode,
      source: "OPEN_FOOD_FACTS",
    },
  };
}
