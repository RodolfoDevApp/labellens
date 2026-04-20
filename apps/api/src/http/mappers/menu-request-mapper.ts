import type { MealType, MenuItem, MenuMeal, NutritionFacts } from "@labellens/domain";
import type { ParsedMenuCalculationItem } from "../schemas/menu-item-schema.js";
import type { ParsedMenuMeal } from "../schemas/menu-meal-schema.js";
import type { ParsedNutritionFacts } from "../schemas/nutrition-facts-schema.js";

export function toNutritionFacts(nutrition: ParsedNutritionFacts): NutritionFacts {
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

export function toMenuItem(item: ParsedMenuCalculationItem): MenuItem {
  return {
    id: item.id,
    source: item.source,
    sourceId: item.sourceId,
    displayName: item.displayName,
    grams: item.grams,
    nutrition: toNutritionFacts(item.nutrition),
  };
}

export function toMenuMeal(meal: ParsedMenuMeal): MenuMeal {
  return {
    type: meal.type as MealType,
    items: meal.items.map(toMenuItem),
  };
}
