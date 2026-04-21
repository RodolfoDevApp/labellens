import { DeleteMessageCommand, ReceiveMessageCommand, type Message, type SQSClient } from "@aws-sdk/client-sqs";

export type SqsMessageHandler = (message: Message) => Promise<void>;

export type SqsPollingConsumerOptions = {
  queueUrl: string;
  maxMessages: number;
  waitTimeSeconds: number;
  visibilityTimeoutSeconds: number;
};

export class SqsPollingConsumer {
  constructor(
    private readonly sqs: SQSClient,
    private readonly options: SqsPollingConsumerOptions,
    private readonly handler: SqsMessageHandler,
  ) {}

  async pollOnce(): Promise<number> {
    const response = await this.sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: this.options.queueUrl,
        MaxNumberOfMessages: this.options.maxMessages,
        WaitTimeSeconds: this.options.waitTimeSeconds,
        VisibilityTimeout: this.options.visibilityTimeoutSeconds,
        MessageAttributeNames: ["All"],
      }),
    );

    const messages = response.Messages ?? [];

    for (const message of messages) {
      await this.handler(message);

      if (message.ReceiptHandle) {
        await this.sqs.send(
          new DeleteMessageCommand({
            QueueUrl: this.options.queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          }),
        );
      }
    }

    return messages.length;
  }
}
