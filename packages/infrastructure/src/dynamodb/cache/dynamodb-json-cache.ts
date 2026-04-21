import { GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient, ScanCommandInput } from "@aws-sdk/lib-dynamodb";
import type { DynamoDbTableName } from "../table-name.js";
import { nowEpochSeconds, ttlEpochSeconds } from "./cache-clock.js";
import type { CacheDynamoDbItem } from "./cache-dynamodb-item.js";

export class DynamoDbJsonCache<TValue> {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: DynamoDbTableName,
    private readonly ttlSeconds: number,
  ) {}

  async get(key: { PK: string; SK: string }): Promise<TValue | null> {
    const response = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: key,
      }),
    );
    const item = response.Item as CacheDynamoDbItem<TValue> | undefined;

    if (!item || item.expiresAt <= nowEpochSeconds()) {
      return null;
    }

    return item.value;
  }

  async set(key: { PK: string; SK: string }, value: TValue): Promise<TValue> {
    const item: CacheDynamoDbItem<TValue> = {
      ...key,
      entityType: "Cache",
      value,
      expiresAt: ttlEpochSeconds(this.ttlSeconds),
      updatedAt: new Date().toISOString(),
    };

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );

    return value;
  }

  async listPkValuesByPrefix(pkPrefix: string, limit: number): Promise<string[]> {
    const normalizedLimit = Math.max(0, limit);

    if (normalizedLimit === 0) {
      return [];
    }

    const values: string[] = [];
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
      const input: ScanCommandInput = {
        TableName: this.tableName,
        FilterExpression:
          "begins_with(PK, :pkPrefix) AND SK = :detail AND #entityType = :entityType AND expiresAt > :now",
        ExpressionAttributeNames: {
          "#entityType": "entityType",
        },
        ExpressionAttributeValues: {
          ":pkPrefix": pkPrefix,
          ":detail": "DETAIL",
          ":entityType": "Cache",
          ":now": nowEpochSeconds(),
        },
      };

      if (exclusiveStartKey) {
        input.ExclusiveStartKey = exclusiveStartKey;
      }

      const response = await this.client.send(new ScanCommand(input));

      for (const item of response.Items ?? []) {
        if (values.length >= normalizedLimit) {
          break;
        }

        const pk = item.PK;

        if (typeof pk === "string") {
          values.push(pk);
        }
      }

      exclusiveStartKey = response.LastEvaluatedKey;
    } while (values.length < normalizedLimit && exclusiveStartKey);

    return values;
  }
}