import type { CalculatedNutrition, NutritionFacts } from "./nutrition-facts.js";

function calc(valuePer100g: number | null | undefined, grams: number): number | null {
  if (valuePer100g === null || valuePer100g === undefined) {
    return null;
  }

  return Number(((valuePer100g * grams) / 100).toFixed(2));
}

export function calculateNutritionForGrams(
  nutrition: NutritionFacts,
  grams: number,
): CalculatedNutrition {
  if (!Number.isFinite(grams) || grams <= 0) {
    throw new Error("grams must be a positive number");
  }

  const result: CalculatedNutrition = {
    grams,
    energyKcal: calc(nutrition.energyKcalPer100g, grams),
    proteinG: calc(nutrition.proteinGPer100g, grams),
    carbsG: calc(nutrition.carbsGPer100g, grams),
    fatG: calc(nutrition.fatGPer100g, grams),
    sugarG: calc(nutrition.sugarGPer100g, grams),
    fiberG: calc(nutrition.fiberGPer100g, grams),
    sodiumMg: calc(nutrition.sodiumMgPer100g, grams),
    partialData: nutrition.completeness !== "COMPLETE",
  };

  return result;
}
