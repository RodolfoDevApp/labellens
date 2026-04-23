import type { Message } from "@aws-sdk/client-sqs";
import type { SqsLambdaRecord } from "./sqs-lambda-types.js";

export function toSqsMessage(record: SqsLambdaRecord): Message {
  return {
    MessageId: record.messageId,
    ReceiptHandle: record.receiptHandle,
    Body: record.body,
    Attributes: record.attributes,
  };
}

export function getQueueNameFromArn(queueArn: string | undefined): string {
  const queueName = queueArn?.split(":").at(-1);

  if (!queueName) {
    return "unknown-dlq";
  }

  return queueName;
}
