import type { MenuItemSource, NutritionFacts } from "@labellens/domain";

export type FavoriteItem = {
  id: string;
  ownerId: string;
  source: MenuItemSource;
  sourceId: string;
  displayName: string;
  defaultGrams: number;
  nutrition: NutritionFacts;
  createdAt: string;
  updatedAt: string;
};

export type SaveFavoriteInput = {
  ownerId: string;
  source: MenuItemSource;
  sourceId: string;
  displayName: string;
  defaultGrams: number;
  nutrition: NutritionFacts;
};

const favoritesByOwner = new Map<string, FavoriteItem[]>();

function normalizeName(displayName: string): string {
  return displayName.trim();
}

function findMatchingFavorite(items: FavoriteItem[], input: SaveFavoriteInput): FavoriteItem | undefined {
  return items.find(
    (item) => item.source === input.source && item.sourceId === input.sourceId,
  );
}

export function saveFavorite(input: SaveFavoriteInput): FavoriteItem {
  const ownerItems = favoritesByOwner.get(input.ownerId) ?? [];
  const existingItem = findMatchingFavorite(ownerItems, input);
  const now = new Date().toISOString();

  if (existingItem) {
    const updatedItem: FavoriteItem = {
      ...existingItem,
      displayName: normalizeName(input.displayName),
      defaultGrams: input.defaultGrams,
      nutrition: input.nutrition,
      updatedAt: now,
    };

    favoritesByOwner.set(
      input.ownerId,
      ownerItems.map((item) => (item.id === existingItem.id ? updatedItem : item)),
    );

    return updatedItem;
  }

  const item: FavoriteItem = {
    id: `favorite_${crypto.randomUUID()}`,
    ownerId: input.ownerId,
    source: input.source,
    sourceId: input.sourceId,
    displayName: normalizeName(input.displayName),
    defaultGrams: input.defaultGrams,
    nutrition: input.nutrition,
    createdAt: now,
    updatedAt: now,
  };

  favoritesByOwner.set(input.ownerId, [item, ...ownerItems]);
  return item;
}

export function listFavorites(ownerId: string): FavoriteItem[] {
  return [...(favoritesByOwner.get(ownerId) ?? [])].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function deleteFavorite(ownerId: string, favoriteId: string): boolean {
  const ownerItems = favoritesByOwner.get(ownerId) ?? [];
  const nextItems = ownerItems.filter((item) => item.id !== favoriteId);

  if (nextItems.length === ownerItems.length) {
    return false;
  }

  favoritesByOwner.set(ownerId, nextItems);
  return true;
}

export function clearFavoritesStoreForTests(): void {
  favoritesByOwner.clear();
}
