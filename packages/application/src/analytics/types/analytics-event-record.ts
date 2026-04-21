import type { AnalyticsEventType } from "../../events/analytics-events.js";
import type { LabelLensEventProducer } from "../../ports/event-publisher.js";

export type AnalyticsEventRecord = {
  eventId: string;
  eventType: AnalyticsEventType;
  eventVersion: 1;
  occurredAt: string;
  correlationId: string;
  producer: LabelLensEventProducer;
  payload: unknown;
  recordedAt: string;
};
