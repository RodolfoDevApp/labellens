import type { LabelLensEvent } from "@labellens/application";

export function parseLabelLensEvent(messageBody: string | undefined): LabelLensEvent {
  if (!messageBody) {
    throw new Error("SQS message body is empty.");
  }

  const parsed = JSON.parse(messageBody) as Partial<LabelLensEvent>;

  if (!parsed.eventId || !parsed.eventType || !parsed.occurredAt || !parsed.correlationId || !parsed.payload) {
    throw new Error("SQS message body is not a valid LabelLens event.");
  }

  return parsed as LabelLensEvent;
}
