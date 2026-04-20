import type { NutritionFactsContract } from "../schemas/nutrition-facts-schema.js";
import type { SourceModeContract } from "./source-mode-contract.js";

export type ProductItemContract = {
  barcode: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  ingredientsText?: string | null;
  allergens: string[];
  additives: string[];
  novaGroup?: number | null;
  nutriScore?: string | null;
  nutrition: NutritionFactsContract;
};

export type ProductLookupResponseContract = {
  product: ProductItemContract;
  source: "OPEN_FOOD_FACTS";
  sourceMode: SourceModeContract;
};

export type ProductSearchResponseContract = {
  items: ProductItemContract[];
  source: "OPEN_FOOD_FACTS";
  sourceMode: SourceModeContract;
  queryUsed: string;
};
