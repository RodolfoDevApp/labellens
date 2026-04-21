import type { AnalyticsEventType } from "@labellens/application";

export type AnalyticsEventDynamoDbItem = {
  PK: "OPS#ANALYTICS";
  SK: string;
  eventId: string;
  eventType: AnalyticsEventType;
  occurredAt: string;
  correlationId: string;
  payload: unknown;
  recordedAt: string;
};
