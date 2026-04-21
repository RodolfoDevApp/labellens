import type { LabelLensEventType } from "@labellens/application";

export type EventIdempotencyDynamoDbItem = {
  PK: string;
  SK: "PROCESSED";
  entityType: "EventIdempotency";
  eventId: string;
  eventType: LabelLensEventType;
  occurredAt: string;
  correlationId: string;
  processedAt: string;
  expiresAt: number;
};
