import { PutCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { AnalyticsEventRecord, AnalyticsEventRepository } from "@labellens/application";
import type { AnalyticsEventDynamoDbItem } from "./analytics-event-dynamodb-item.js";
import { analyticsEventPk, analyticsEventSk } from "./analytics-event-keys.js";

export class DynamoDbAnalyticsEventRepository implements AnalyticsEventRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async save(record: AnalyticsEventRecord): Promise<void> {
    const item: AnalyticsEventDynamoDbItem = {
      PK: analyticsEventPk(),
      SK: analyticsEventSk(record.eventId),
      entityType: "AnalyticsEvent",
      eventId: record.eventId,
      eventType: record.eventType,
      eventVersion: record.eventVersion,
      occurredAt: record.occurredAt,
      correlationId: record.correlationId,
      producer: record.producer,
      payload: record.payload,
      recordedAt: record.recordedAt,
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