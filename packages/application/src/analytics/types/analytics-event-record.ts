import type { AnalyticsEventType } from "../../events/analytics-events.js";

export type AnalyticsEventRecord = {
  eventId: string;
  eventType: AnalyticsEventType;
  occurredAt: string;
  correlationId: string;
  payload: unknown;
  recordedAt: string;
};
