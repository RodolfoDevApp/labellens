import type { FoodItem, NutritionFacts } from "@labellens/domain";

export type FoodSourceMode = "fixture" | "live";

export type FoodSearchResponse = {
  items: FoodItem[];
  source: "USDA";
  sourceMode: FoodSourceMode;
  queryUsed: string;
};

export type FoodDetailResponse = {
  food: FoodItem;
  nutritionFacts: NutritionFacts;
  source: "USDA";
  sourceMode: FoodSourceMode;
};
