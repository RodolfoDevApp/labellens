import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import {
  createFavoriteId,
  parseFavoriteId,
  type FavoriteItem,
  type FavoriteRepository,
  type SaveFavoriteInput,
} from "@labellens/application";
import type { DynamoDbTableName } from "../table-name.js";
import type { FavoriteDynamoDbItem } from "./favorite-dynamodb-item.js";
import { normalizeFavoriteDisplayName } from "./favorite-display-name.js";
import { favoriteSortKey, favoriteSortKeyPrefix, userPartitionKey } from "./favorite-keys.js";
import { toFavoriteItem } from "./favorite-mapper.js";

export class DynamoDbFavoriteRepository implements FavoriteRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: DynamoDbTableName,
  ) {}

  async save(input: SaveFavoriteInput): Promise<FavoriteItem> {
    const key = {
      PK: userPartitionKey(input.ownerId),
      SK: favoriteSortKey(input.source, input.sourceId),
    };
    const existingResponse = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: key,
      }),
    );
    const existingItem = existingResponse.Item as FavoriteDynamoDbItem | undefined;
    const now = new Date().toISOString();
    const item: FavoriteDynamoDbItem = {
      ...key,
      entityType: "Favorite",
      id: existingItem?.id ?? createFavoriteId(input.source, input.sourceId),
      ownerId: input.ownerId,
      source: input.source,
      sourceId: input.sourceId,
      displayName: normalizeFavoriteDisplayName(input.displayName),
      defaultGrams: input.defaultGrams,
      nutrition: input.nutrition,
      createdAt: existingItem?.createdAt ?? now,
      updatedAt: now,
    };

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );

    return toFavoriteItem(item);
  }

  async list(ownerId: string): Promise<FavoriteItem[]> {
    const response = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": userPartitionKey(ownerId),
          ":skPrefix": favoriteSortKeyPrefix(),
        },
      }),
    );
    const items = (response.Items ?? []) as FavoriteDynamoDbItem[];

    return items.map(toFavoriteItem).sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  async delete(ownerId: string, favoriteId: string): Promise<boolean> {
    const parsedFavoriteId = parseFavoriteId(favoriteId);

    if (!parsedFavoriteId) {
      return false;
    }

    const key = {
      PK: userPartitionKey(ownerId),
      SK: favoriteSortKey(parsedFavoriteId.source, parsedFavoriteId.sourceId),
    };
    const existingResponse = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: key,
      }),
    );

    if (!existingResponse.Item) {
      return false;
    }

    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: key,
      }),
    );

    return true;
  }
}
