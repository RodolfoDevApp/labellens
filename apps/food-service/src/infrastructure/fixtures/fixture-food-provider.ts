import type { FoodItem } from "@labellens/domain";
import { normalizeSearchText } from "../query/food-query-translator.js";
import { foodFixtures } from "./food-fixtures.js";
import type { FoodProvider } from "../../application/food-provider.js";
import type { FoodDetailResponse, FoodSearchResponse } from "../../application/food-service-responses.js";

function normalizeFdcId(fdcId: string): string {
  return fdcId.replace(/^USDA-/i, "").trim();
}

function toPublicFood(food: (typeof foodFixtures)[number]): FoodItem {
  const { searchAliases: _searchAliases, ...publicFood } = food;
  return publicFood;
}

function searchFixtureFoods(query: string): FoodItem[] {
  const normalizedQuery = normalizeSearchText(query);

  return foodFixtures
    .filter((food) => {
      const rawSearchableValues: string[] = [
        food.name,
        food.brandName ?? "",
        food.dataType ?? "",
        ...food.searchAliases,
      ];

      const searchableValues = rawSearchableValues.map((value) =>
        normalizeSearchText(value),
      );

      return searchableValues.some((value) => value.includes(normalizedQuery));
    })
    .map(toPublicFood);
}

function getFixtureFoodById(fdcId: string): FoodItem | null {
  const normalizedFdcId = normalizeFdcId(fdcId);
  const fixture = foodFixtures.find(
    (food) => food.nutrition.sourceId === normalizedFdcId || food.id === fdcId,
  );

  return fixture ? toPublicFood(fixture) : null;
}

export class FixtureFoodProvider implements FoodProvider {
  async searchFoods(query: string): Promise<FoodSearchResponse> {
    return {
      items: searchFixtureFoods(query),
      source: "USDA",
      sourceMode: "fixture",
      queryUsed: query,
    };
  }

  async getFoodById(fdcId: string): Promise<FoodDetailResponse | null> {
    const fixtureFood = getFixtureFoodById(fdcId);

    return fixtureFood
      ? {
          food: fixtureFood,
          nutritionFacts: fixtureFood.nutrition,
          source: "USDA",
          sourceMode: "fixture",
        }
      : null;
  }
}
