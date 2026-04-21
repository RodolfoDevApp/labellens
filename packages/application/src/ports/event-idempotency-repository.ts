import type { LabelLensEvent } from "./event-publisher.js";

export type EventIdempotencyInput = Pick<LabelLensEvent, "eventId" | "eventType" | "occurredAt" | "correlationId">;

export interface EventIdempotencyRepository {
  tryMarkProcessed(event: EventIdempotencyInput): Promise<boolean>;
}
