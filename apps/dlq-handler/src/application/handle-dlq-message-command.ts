import { randomUUID } from "node:crypto";
import type { Message } from "@aws-sdk/client-sqs";
import { RecordDlqMessageCommand } from "@labellens/application";
import { parseLabelLensEvent } from "@labellens/infrastructure";

export class HandleDlqMessageCommand {
  constructor(private readonly recordDlqMessage: RecordDlqMessageCommand) {}

  async execute(sourceQueueName: string, message: Message): Promise<void> {
    const rawBody = message.Body ?? null;
    let eventId: string | null = null;
    let eventType: string | null = null;
    let correlationId: string | null = null;
    let producer: string | null = null;
    let payload: unknown = null;
    let errorSummary: string | null = null;

    if (rawBody) {
      try {
        const event = parseLabelLensEvent(rawBody);
        eventId = event.eventId;
        eventType = event.eventType;
        correlationId = event.correlationId;
        producer = event.producer;
        payload = event.payload;
      } catch (error) {
        errorSummary = error instanceof Error ? error.message : "Unable to parse DLQ message body.";
        payload = tryParseJson(rawBody);
      }
    } else {
      errorSummary = "SQS message body is empty.";
    }

    await this.recordDlqMessage.execute({
      id: message.MessageId ?? randomUUID(),
      sourceQueueName,
      messageId: message.MessageId ?? null,
      eventId,
      eventType,
      correlationId,
      producer,
      payload,
      rawBody,
      errorSummary,
      receivedAt: new Date().toISOString(),
    });
  }
}

function tryParseJson(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return null;
  }
}
