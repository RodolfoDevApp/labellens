import { PutCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { DlqMessageRecord, DlqMessageRepository } from "@labellens/application";
import type { DlqMessageDynamoDbItem } from "./dlq-message-dynamodb-item.js";
import { dlqMessagePk, dlqMessageSk } from "./dlq-message-keys.js";

export class DynamoDbDlqMessageRepository implements DlqMessageRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async save(record: DlqMessageRecord): Promise<void> {
    const item: DlqMessageDynamoDbItem = {
      PK: dlqMessagePk(),
      SK: dlqMessageSk(record.sourceQueueName, record.id),
      entityType: "DlqMessage",
      ...record,
    };

    await this.client
      .send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
          ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
        }),
      )
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
          return;
        }

        throw error;
      });
  }
}
