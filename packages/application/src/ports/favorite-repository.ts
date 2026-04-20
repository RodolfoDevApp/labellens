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

export interface FavoriteRepository {
  save(input: SaveFavoriteInput): Promise<FavoriteItem>;
  list(ownerId: string): Promise<FavoriteItem[]>;
  delete(ownerId: string, favoriteId: string): Promise<boolean>;
}
