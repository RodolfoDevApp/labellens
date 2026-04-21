import { randomUUID } from "node:crypto";
import type { LabelLensEvent } from "../ports/event-publisher.js";

export type ProductNotFoundEventPayload = {
  barcode: string;
  source: "OPEN_FOOD_FACTS";
  sourceMode: "fixture" | "live";
  reason: "OFF_NOT_FOUND";
  requestPath: "/api/v1/products/barcode/{barcode}";
};

export type ProductNotFoundEvent = LabelLensEvent<ProductNotFoundEventPayload> & {
  eventType: "product.not_found.v1";
  producer: "product-service";
};

export function createProductNotFoundEvent(input: {
  barcode: string;
  sourceMode: "fixture" | "live";
  correlationId: string;
  now?: Date;
  eventId?: string;
}): ProductNotFoundEvent {
  return {
    eventId: input.eventId ?? randomUUID(),
    eventType: "product.not_found.v1",
    eventVersion: 1,
    occurredAt: (input.now ?? new Date()).toISOString(),
    correlationId: input.correlationId,
    producer: "product-service",
    payload: {
      barcode: input.barcode,
      source: "OPEN_FOOD_FACTS",
      sourceMode: input.sourceMode,
      reason: "OFF_NOT_FOUND",
      requestPath: "/api/v1/products/barcode/{barcode}",
    },
  };
}
