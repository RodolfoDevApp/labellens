import {
  createFavoriteId,
  type FavoriteItem,
  type FavoriteRepository,
  type SaveFavoriteInput,
} from "@labellens/application";
import { findMatchingFavorite, normalizeFavoriteDisplayName } from "./favorite-normalizer.js";

export class InMemoryFavoriteRepository implements FavoriteRepository {
  private readonly favoritesByOwner = new Map<string, FavoriteItem[]>();

  async save(input: SaveFavoriteInput): Promise<FavoriteItem> {
    const ownerItems = this.favoritesByOwner.get(input.ownerId) ?? [];
    const existingItem = findMatchingFavorite(ownerItems, input);
    const now = new Date().toISOString();

    if (existingItem) {
      const updatedItem: FavoriteItem = {
        ...existingItem,
        displayName: normalizeFavoriteDisplayName(input.displayName),
        defaultGrams: input.defaultGrams,
        nutrition: input.nutrition,
        updatedAt: now,
      };

      this.favoritesByOwner.set(
        input.ownerId,
        ownerItems.map((item) => (item.id === existingItem.id ? updatedItem : item)),
      );

      return updatedItem;
    }

    const item: FavoriteItem = {
      id: createFavoriteId(input.source, input.sourceId),
      ownerId: input.ownerId,
      source: input.source,
      sourceId: input.sourceId,
      displayName: normalizeFavoriteDisplayName(input.displayName),
      defaultGrams: input.defaultGrams,
      nutrition: input.nutrition,
      createdAt: now,
      updatedAt: now,
    };

    this.favoritesByOwner.set(input.ownerId, [item, ...ownerItems]);
    return item;
  }

  async list(ownerId: string): Promise<FavoriteItem[]> {
    return [...(this.favoritesByOwner.get(ownerId) ?? [])].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  async delete(ownerId: string, favoriteId: string): Promise<boolean> {
    const ownerItems = this.favoritesByOwner.get(ownerId) ?? [];
    const nextItems = ownerItems.filter((item) => item.id !== favoriteId);

    if (nextItems.length === ownerItems.length) {
      return false;
    }

    this.favoritesByOwner.set(ownerId, nextItems);
    return true;
  }
}
