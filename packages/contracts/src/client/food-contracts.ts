import type { NutritionFactsContract } from "../schemas/nutrition-facts-schema.js";
import type { SourceModeContract } from "./source-mode-contract.js";

export type FoodItemContract = {
  id: string;
  name: string;
  brandName?: string | null;
  dataType?: string | null;
  servingSize?: number | null;
  servingSizeUnit?: string | null;
  nutrition: NutritionFactsContract;
};

export type FoodSearchResponseContract = {
  items: FoodItemContract[];
  source: "USDA";
  sourceMode: SourceModeContract;
  queryUsed: string;
  page: number;
};

export type FoodDetailResponseContract = {
  food: FoodItemContract;
  nutritionFacts: NutritionFactsContract;
  source: "USDA";
  sourceMode: SourceModeContract;
};
