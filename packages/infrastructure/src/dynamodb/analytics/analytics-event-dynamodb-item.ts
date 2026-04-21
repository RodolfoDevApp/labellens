import type { AnalyticsEventType, LabelLensEventProducer } from "@labellens/application";

export type AnalyticsEventDynamoDbItem = {
  PK: string;
  SK: string;
  entityType: "AnalyticsEvent";
  eventId: string;
  eventType: AnalyticsEventType;
  eventVersion: 1;
  occurredAt: string;
  correlationId: string;
  producer: LabelLensEventProducer;
  payload: unknown;
  recordedAt: string;
};
