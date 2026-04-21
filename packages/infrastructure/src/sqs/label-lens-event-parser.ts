import type { LabelLensEvent, LabelLensEventProducer, LabelLensEventType } from "@labellens/application";

const allowedEventTypes = new Set<LabelLensEventType>([
  "food.searched.v1",
  "product.scanned.v1",
  "product.not_found.v1",
  "menu.saved.v1",
  "favorite.saved.v1",
  "cache.refresh.food.requested.v1",
  "cache.refresh.product.requested.v1",
]);

const allowedProducers = new Set<LabelLensEventProducer>([
  "food-service",
  "product-service",
  "menu-service",
  "favorites-service",
  "eventbridge-scheduler",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`SQS message body is not a valid LabelLens event: ${fieldName} is required.`);
  }

  return value;
}

export function parseLabelLensEvent(messageBody: string | undefined): LabelLensEvent {
  if (!messageBody) {
    throw new Error("SQS message body is empty.");
  }

  const parsed: unknown = JSON.parse(messageBody);

  if (!isRecord(parsed)) {
    throw new Error("SQS message body is not a valid LabelLens event.");
  }

  const eventId = requireString(parsed.eventId, "eventId");
  const eventType = requireString(parsed.eventType, "eventType") as LabelLensEventType;
  const occurredAt = requireString(parsed.occurredAt, "occurredAt");
  const correlationId = requireString(parsed.correlationId, "correlationId");
  const producer = requireString(parsed.producer, "producer") as LabelLensEventProducer;

  if (!allowedEventTypes.has(eventType)) {
    throw new Error(`Unsupported event type: ${eventType}`);
  }

  if (parsed.eventVersion !== 1) {
    throw new Error("SQS message body is not a valid LabelLens event: eventVersion must be 1.");
  }

  if (!allowedProducers.has(producer)) {
    throw new Error(`Unsupported event producer: ${producer}`);
  }

  if (!isRecord(parsed.payload)) {
    throw new Error("SQS message body is not a valid LabelLens event: payload must be an object.");
  }

  return {
    eventId,
    eventType,
    eventVersion: 1,
    occurredAt,
    correlationId,
    producer,
    payload: parsed.payload,
  };
}
