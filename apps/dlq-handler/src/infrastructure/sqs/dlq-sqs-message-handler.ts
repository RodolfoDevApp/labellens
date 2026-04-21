import type { Message } from "@aws-sdk/client-sqs";
import type { HandleDlqMessageCommand } from "../../application/handle-dlq-message-command.js";

export class DlqSqsMessageHandler {
  constructor(
    private readonly sourceQueueName: string,
    private readonly command: HandleDlqMessageCommand,
  ) {}

  async handle(message: Message): Promise<void> {
    await this.command.execute(this.sourceQueueName, message);
  }
}
