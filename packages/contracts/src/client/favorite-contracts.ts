import type { FavoriteItemInputContract } from "../schemas/favorite-item-input-schema.js";
import type { NutritionFactsContract } from "../schemas/nutrition-facts-schema.js";
import type { Source } from "../schemas/source-schema.js";

export type FavoriteItemContract = {
  id: string;
  ownerId: string;
  source: Source;
  sourceId: string;
  displayName: string;
  defaultGrams: number;
  nutrition: NutritionFactsContract;
  createdAt: string;
  updatedAt: string;
};

export type SaveFavoriteApiRequestContract = FavoriteItemInputContract;

export type FavoriteItemResponseContract = {
  item: FavoriteItemContract;
};

export type FavoritesResponseContract = {
  items: FavoriteItemContract[];
};

export type DeleteFavoriteItemResponseContract = {
  deleted: boolean;
};
