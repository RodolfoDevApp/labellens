import type { FavoriteItem } from "@labellens/application";
import type { FavoriteDynamoDbItem } from "./favorite-dynamodb-item.js";

export function toFavoriteItem(item: FavoriteDynamoDbItem): FavoriteItem {
  return {
    id: item.id,
    ownerId: item.ownerId,
    source: item.source,
    sourceId: item.sourceId,
    displayName: item.displayName,
    defaultGrams: item.defaultGrams,
    nutrition: item.nutrition,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
