import type { LabelLensEventType } from "@labellens/application";

export type QueueUrlMap = Partial<Record<LabelLensEventType, string>>;

export function requireQueueUrl(map: QueueUrlMap, eventType: LabelLensEventType): string {
  const queueUrl = map[eventType];

  if (!queueUrl) {
    throw new Error(`No SQS queue URL configured for event type ${eventType}.`);
  }

  return queueUrl;
}
