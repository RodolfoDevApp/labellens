import { SendMessageCommand, type SQSClient } from "@aws-sdk/client-sqs";
import type { EventPublisher, LabelLensEvent } from "@labellens/application";
import { requireQueueUrl, type QueueUrlMap } from "./queue-url-map.js";

export class SqsEventPublisher implements EventPublisher {
  constructor(
    private readonly sqs: SQSClient,
    private readonly queueUrls: QueueUrlMap,
  ) {}

  async publish(event: LabelLensEvent): Promise<void> {
    await this.sqs.send(
      new SendMessageCommand({
        QueueUrl: requireQueueUrl(this.queueUrls, event.eventType),
        MessageBody: JSON.stringify(event),
        MessageAttributes: {
          eventType: {
            DataType: "String",
            StringValue: event.eventType,
          },
          eventVersion: {
            DataType: "Number",
            StringValue: String(event.eventVersion),
          },
          producer: {
            DataType: "String",
            StringValue: event.producer,
          },
          correlationId: {
            DataType: "String",
            StringValue: event.correlationId,
          },
        },
      }),
    );
  }
}
