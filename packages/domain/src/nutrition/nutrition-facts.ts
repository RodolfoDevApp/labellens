export type NutritionSource = "USDA" | "OPEN_FOOD_FACTS";

export type NutritionCompleteness = "COMPLETE" | "PARTIAL" | "LOW";

export type NutritionFacts = {
  energyKcalPer100g: number | null;
  proteinGPer100g: number | null;
  carbsGPer100g: number | null;
  fatGPer100g: number | null;
  sugarGPer100g?: number | null;
  fiberGPer100g?: number | null;
  sodiumMgPer100g?: number | null;
  source: NutritionSource;
  sourceId: string;
  lastFetchedAt: string;
  completeness: NutritionCompleteness;
};

export type CalculatedNutrition = {
  grams: number;
  energyKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  sugarG?: number | null;
  fiberG?: number | null;
  sodiumMg?: number | null;
  partialData: boolean;
};
