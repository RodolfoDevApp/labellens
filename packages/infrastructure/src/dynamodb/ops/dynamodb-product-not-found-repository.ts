import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { ProductNotFoundRecord, ProductNotFoundRepository } from "@labellens/application";
import type { ProductNotFoundEventDynamoDbItem } from "./product-not-found-dynamodb-item.js";
import {
  productNotFoundDailyAggregateSk,
  productNotFoundEventSk,
  productNotFoundPk,
} from "./product-not-found-keys.js";

function yyyyMmDd(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

export class DynamoDbProductNotFoundRepository implements ProductNotFoundRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async save(record: ProductNotFoundRecord): Promise<void> {
    const item: ProductNotFoundEventDynamoDbItem = {
      PK: productNotFoundPk(),
      SK: productNotFoundEventSk(record.eventId),
      entityType: "ProductNotFoundEvent",
      eventId: record.eventId,
      barcode: record.barcode,
      source: record.source,
      sourceMode: record.sourceMode,
      reason: record.reason,
      requestPath: record.requestPath,
      correlationId: record.correlationId,
      occurredAt: record.occurredAt,
      recordedAt: record.recordedAt,
    };

    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
          ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
        }),
      );
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
        return;
      }

      throw error;
    }

    await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: productNotFoundPk(),
          SK: productNotFoundDailyAggregateSk(yyyyMmDd(record.occurredAt)),
        },
        UpdateExpression:
          "SET #entityType = if_not_exists(#entityType, :entityType), #lastBarcode = :barcode, #lastSeenAt = :lastSeenAt, #lastCorrelationId = :correlationId, #updatedAt = :updatedAt ADD #count :one",
        ExpressionAttributeNames: {
          "#count": "count",
          "#entityType": "entityType",
          "#lastBarcode": "lastBarcode",
          "#lastSeenAt": "lastSeenAt",
          "#lastCorrelationId": "lastCorrelationId",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":one": 1,
          ":entityType": "ProductNotFoundDailyAggregate",
          ":barcode": record.barcode,
          ":lastSeenAt": record.occurredAt,
          ":correlationId": record.correlationId,
          ":updatedAt": record.recordedAt,
        },
      }),
    );
  }
}
