import type { NutritionFacts } from "@labellens/domain";
import type { NutritionFactsContract } from "@labellens/contracts";

export function toNutritionFacts(nutrition: NutritionFactsContract): NutritionFacts {
  return {
    energyKcalPer100g: nutrition.energyKcalPer100g,
    proteinGPer100g: nutrition.proteinGPer100g,
    carbsGPer100g: nutrition.carbsGPer100g,
    fatGPer100g: nutrition.fatGPer100g,
    sugarGPer100g: nutrition.sugarGPer100g ?? null,
    fiberGPer100g: nutrition.fiberGPer100g ?? null,
    sodiumMgPer100g: nutrition.sodiumMgPer100g ?? null,
    source: nutrition.source,
    sourceId: nutrition.sourceId,
    lastFetchedAt: nutrition.lastFetchedAt,
    completeness: nutrition.completeness,
  };
}
