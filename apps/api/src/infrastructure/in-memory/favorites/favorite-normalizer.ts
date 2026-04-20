import type { FavoriteItem, SaveFavoriteInput } from "@labellens/application";

export function normalizeFavoriteDisplayName(displayName: string): string {
  return displayName.trim();
}

export function findMatchingFavorite(
  items: FavoriteItem[],
  input: SaveFavoriteInput,
): FavoriteItem | undefined {
  return items.find((item) => item.source === input.source && item.sourceId === input.sourceId);
}
