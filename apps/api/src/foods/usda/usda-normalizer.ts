import type { FoodItem, NutritionFacts } from "@labellens/domain";
import type { UsdaSearchFood, UsdaFoodNutrient } from "./usda-client.js";

function findNutrientValue(
  nutrients: UsdaFoodNutrient[] | undefined,
  nutrientId: number,
): number | null {
  const nutrient = nutrients?.find((item) => item.nutrientId === nutrientId);
  return typeof nutrient?.value === "number" ? nutrient.value : null;
}

function calculateCompleteness(nutrition: Omit<NutritionFacts, "source" | "sourceId" | "lastFetchedAt" | "completeness">): NutritionFacts["completeness"] {
  const requiredValues = [
    nutrition.energyKcalPer100g,
    nutrition.proteinGPer100g,
    nutrition.carbsGPer100g,
    nutrition.fatGPer100g
  ];

  const presentCount = requiredValues.filter((value) => value !== null).length;

  if (presentCount === requiredValues.length) {
    return "COMPLETE";
  }

  if (presentCount >= 2) {
    return "PARTIAL";
  }

  return "LOW";
}

export function normalizeUsdaSearchFood(food: UsdaSearchFood): FoodItem {
  const baseNutrition = {
    energyKcalPer100g: findNutrientValue(food.foodNutrients, 1008),
    proteinGPer100g: findNutrientValue(food.foodNutrients, 1003),
    carbsGPer100g: findNutrientValue(food.foodNutrients, 1005),
    fatGPer100g: findNutrientValue(food.foodNutrients, 1004),
    sugarGPer100g: findNutrientValue(food.foodNutrients, 2000),
    fiberGPer100g: findNutrientValue(food.foodNutrients, 1079),
    sodiumMgPer100g: findNutrientValue(food.foodNutrients, 1093)
  };

  return {
    id: `USDA-${food.fdcId}`,
    name: food.description,
    brandName: food.brandName ?? food.brandOwner ?? null,
    dataType: food.dataType ?? null,
    servingSize: food.servingSize ?? 100,
    servingSizeUnit: food.servingSizeUnit ?? "g",
    nutrition: {
      ...baseNutrition,
      source: "USDA",
      sourceId: String(food.fdcId),
      lastFetchedAt: new Date().toISOString(),
      completeness: calculateCompleteness(baseNutrition)
    }
  };
}
