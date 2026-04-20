import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type {
  SavedMenu,
  SavedMenuRepository,
  SaveMenuInput,
  UpdateMenuInput,
} from "@labellens/application";
import { calculateMenuTotals } from "@labellens/domain";
import type { DynamoDbTableName } from "../table-name.js";
import type { SavedMenuDynamoDbItem } from "./saved-menu-dynamodb-item.js";
import { normalizeMenuDate, normalizeMenuName } from "./saved-menu-defaults.js";
import { savedMenuSortKey, savedMenuSortKeyPrefix, userPartitionKey } from "./saved-menu-keys.js";
import { flattenMenuItems, sortMenuMeals } from "./saved-menu-meal-utils.js";
import { toSavedMenu } from "./saved-menu-mapper.js";

export class DynamoDbSavedMenuRepository implements SavedMenuRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: DynamoDbTableName,
  ) {}

  async save(input: SaveMenuInput): Promise<SavedMenu> {
    const now = new Date();
    const nowIso = now.toISOString();
    const meals = sortMenuMeals(input.meals);
    const date = normalizeMenuDate(input.date, now);
    const menuId = `menu_${crypto.randomUUID()}`;
    const item: SavedMenuDynamoDbItem = {
      PK: userPartitionKey(input.ownerId),
      SK: savedMenuSortKey(date, menuId),
      entityType: "SavedMenu",
      id: menuId,
      ownerId: input.ownerId,
      name: normalizeMenuName(input.name, date, now),
      date,
      meals,
      totals: calculateMenuTotals(flattenMenuItems(meals)),
      version: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      }),
    );

    return toSavedMenu(item);
  }

  async update(input: UpdateMenuInput): Promise<SavedMenu | null> {
    const existingMenu = await this.get(input.ownerId, input.menuId);

    if (!existingMenu) {
      return null;
    }

    const now = new Date();
    const meals = sortMenuMeals(input.meals);
    const date = normalizeMenuDate(input.date, now);
    const updatedItem: SavedMenuDynamoDbItem = {
      PK: userPartitionKey(input.ownerId),
      SK: savedMenuSortKey(date, input.menuId),
      entityType: "SavedMenu",
      id: input.menuId,
      ownerId: input.ownerId,
      name: normalizeMenuName(input.name, date, now),
      date,
      meals,
      totals: calculateMenuTotals(flattenMenuItems(meals)),
      version: existingMenu.version + 1,
      createdAt: existingMenu.createdAt,
      updatedAt: now.toISOString(),
    };

    if (existingMenu.date !== date) {
      await this.delete(input.ownerId, input.menuId);
    }

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: updatedItem,
      }),
    );

    return toSavedMenu(updatedItem);
  }

  async list(ownerId: string): Promise<SavedMenu[]> {
    const response = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": userPartitionKey(ownerId),
          ":skPrefix": savedMenuSortKeyPrefix(),
        },
      }),
    );
    const items = (response.Items ?? []) as SavedMenuDynamoDbItem[];

    return items.map(toSavedMenu).sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  async get(ownerId: string, menuId: string): Promise<SavedMenu | null> {
    const existingMenu = (await this.list(ownerId)).find((menu) => menu.id === menuId);

    if (!existingMenu) {
      return null;
    }

    const response = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: userPartitionKey(ownerId),
          SK: savedMenuSortKey(existingMenu.date, menuId),
        },
      }),
    );

    return response.Item ? toSavedMenu(response.Item as SavedMenuDynamoDbItem) : null;
  }

  async delete(ownerId: string, menuId: string): Promise<boolean> {
    const existingMenu = (await this.list(ownerId)).find((menu) => menu.id === menuId);

    if (!existingMenu) {
      return false;
    }

    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: userPartitionKey(ownerId),
          SK: savedMenuSortKey(existingMenu.date, menuId),
        },
      }),
    );

    return true;
  }
}
