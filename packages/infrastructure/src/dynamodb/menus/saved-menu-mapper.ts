import type { SavedMenu } from "@labellens/application";
import type { SavedMenuDynamoDbItem } from "./saved-menu-dynamodb-item.js";

export function toSavedMenu(item: SavedMenuDynamoDbItem): SavedMenu {
  return {
    id: item.id,
    ownerId: item.ownerId,
    name: item.name,
    date: item.date,
    meals: item.meals,
    totals: item.totals,
    version: item.version,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
