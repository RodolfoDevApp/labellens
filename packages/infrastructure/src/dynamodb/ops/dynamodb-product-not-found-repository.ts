import { PutCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { ProductNotFoundRecord, ProductNotFoundRepository } from "@labellens/application";
import type { ProductNotFoundDynamoDbItem } from "./product-not-found-dynamodb-item.js";
import { productNotFoundPk, productNotFoundSk } from "./product-not-found-keys.js";

export class DynamoDbProductNotFoundRepository implements ProductNotFoundRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async save(record: ProductNotFoundRecord): Promise<void> {
    const item: ProductNotFoundDynamoDbItem = {
      PK: productNotFoundPk(),
      SK: productNotFoundSk(record.eventId),
      eventId: record.eventId,
      barcode: record.barcode,
      source: record.source,
      correlationId: record.correlationId,
      occurredAt: record.occurredAt,
      recordedAt: record.recordedAt,
    };

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      }),
    ).catch((error: unknown) => {
      if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
        return;
      }

      throw error;
    });
  }
}
