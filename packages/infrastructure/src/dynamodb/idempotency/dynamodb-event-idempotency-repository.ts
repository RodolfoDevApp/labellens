import { PutCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { EventIdempotencyInput, EventIdempotencyRepository } from "@labellens/application";
import type { EventIdempotencyDynamoDbItem } from "./event-idempotency-dynamodb-item.js";
import { eventIdempotencyPk, eventIdempotencySk } from "./event-idempotency-keys.js";

const IDEMPOTENCY_TTL_SECONDS = 7 * 24 * 60 * 60;

export class DynamoDbEventIdempotencyRepository implements EventIdempotencyRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async tryMarkProcessed(event: EventIdempotencyInput): Promise<boolean> {
    const now = this.now();
    const item: EventIdempotencyDynamoDbItem = {
      PK: eventIdempotencyPk(event.eventId),
      SK: eventIdempotencySk(),
      entityType: "EventIdempotency",
      eventId: event.eventId,
      eventType: event.eventType,
      occurredAt: event.occurredAt,
      correlationId: event.correlationId,
      processedAt: now.toISOString(),
      expiresAt: Math.floor(now.getTime() / 1000) + IDEMPOTENCY_TTL_SECONDS,
    };

    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
          ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
        }),
      );

      return true;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
        return false;
      }

      throw error;
    }
  }
}
