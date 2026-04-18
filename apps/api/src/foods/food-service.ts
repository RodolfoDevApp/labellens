import type { FoodItem } from "@labellens/domain";
import { appConfig } from "../config/app-config.js";
import { foodFixtures } from "../fixtures/food-fixtures.js";
import { normalizeSearchText, translateFoodQuery } from "../shared/food-query-translator.js";
import { createUsdaClient } from "./usda/usda-client.js";
import { normalizeUsdaSearchFood } from "./usda/usda-normalizer.js";

export type FoodSearchSourceMode = "live" | "fixture";

export type FoodSearchResponse = {
  items: FoodItem[];
  source: "USDA";
  sourceMode: FoodSearchSourceMode;
  queryUsed: string;
};

function searchFixtureFoods(query: string): FoodItem[] {
  const normalizedQuery = normalizeSearchText(query);

  return foodFixtures
    .filter((food) => {
      const rawSearchableValues: string[] = [
        food.name,
        food.brandName ?? "",
        food.dataType ?? "",
        ...food.searchAliases
      ];

      const searchableValues = rawSearchableValues.map((value) =>
        normalizeSearchText(value),
      );

      return searchableValues.some((value) => value.includes(normalizedQuery));
    })
    .map(({ searchAliases: _searchAliases, ...food }) => food);
}

export async function searchFoods(query: string, page = 1): Promise<FoodSearchResponse> {
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery.length < 2) {
    return {
      items: [],
      source: "USDA",
      sourceMode: appConfig.usdaApiKey ? "live" : "fixture",
      queryUsed: query
    };
  }

  const translatedQuery = translateFoodQuery(query);

  if (!appConfig.usdaApiKey) {
    return {
      items: searchFixtureFoods(query),
      source: "USDA",
      sourceMode: "fixture",
      queryUsed: translatedQuery
    };
  }

  const usdaClient = createUsdaClient();
  const response = await usdaClient.searchFoods(translatedQuery, page);

  return {
    items: (response.foods ?? []).map(normalizeUsdaSearchFood),
    source: "USDA",
    sourceMode: "live",
    queryUsed: translatedQuery
  };
}
