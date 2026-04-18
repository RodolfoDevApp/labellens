import type { FoodItem } from "@labellens/domain";
import { appConfig } from "../config/app-config.js";
import { foodCache } from "./food-cache.js";
import { foodFixtures } from "../fixtures/food-fixtures.js";
import { normalizeSearchText, translateFoodQuery } from "../shared/food-query-translator.js";
import { createUsdaClient } from "./usda/usda-client.js";
import { normalizeUsdaFood, normalizeUsdaSearchFood } from "./usda/usda-normalizer.js";
import { rankUsdaFoods } from "./usda-ranking.js";

export type FoodSearchSourceMode = "live" | "fixture";

export type FoodSearchResponse = {
  items: FoodItem[];
  source: "USDA";
  sourceMode: FoodSearchSourceMode;
  queryUsed: string;
};

export type FoodDetailResponse = {
  food: FoodItem;
  nutritionFacts: FoodItem["nutrition"];
  source: "USDA";
  sourceMode: FoodSearchSourceMode;
};

function toPublicFood(food: (typeof foodFixtures)[number]): FoodItem {
  const { searchAliases: _searchAliases, ...publicFood } = food;
  return publicFood;
}

function normalizeFdcId(fdcId: string): string {
  return fdcId.replace(/^USDA-/i, "").trim();
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

export async function searchFoods(query: string, page = 1): Promise<FoodSearchResponse> {
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery.length < 2) {
    return {
      items: [],
      source: "USDA",
      sourceMode: appConfig.usdaApiKey ? "live" : "fixture",
      queryUsed: query,
    };
  }

  const translatedQuery = translateFoodQuery(query);
  const cachedSearch = foodCache.getSearch(translatedQuery, page);

  if (cachedSearch) {
    return cachedSearch;
  }

  if (!appConfig.usdaApiKey) {
    return foodCache.setSearch(translatedQuery, page, {
      items: searchFixtureFoods(query),
      source: "USDA",
      sourceMode: "fixture",
      queryUsed: translatedQuery,
    });
  }

  const usdaClient = createUsdaClient();
  const response = await usdaClient.searchFoods(translatedQuery, page);

  return foodCache.setSearch(translatedQuery, page, {
    items: rankUsdaFoods(response.foods ?? [], translatedQuery)
      .slice(0, 10)
      .map(normalizeUsdaSearchFood),
    source: "USDA",
    sourceMode: "live",
    queryUsed: translatedQuery,
  });
}

export async function getFoodById(fdcId: string): Promise<FoodDetailResponse | null> {
  const normalizedFdcId = normalizeFdcId(fdcId);
  const cachedDetail = foodCache.getDetail(normalizedFdcId);

  if (cachedDetail) {
    return cachedDetail;
  }

  if (!appConfig.usdaApiKey) {
    const fixtureFood = getFixtureFoodById(normalizedFdcId);

    return fixtureFood
      ? foodCache.setDetail(normalizedFdcId, {
          food: fixtureFood,
          nutritionFacts: fixtureFood.nutrition,
          source: "USDA",
          sourceMode: "fixture",
        })
      : null;
  }

  const usdaClient = createUsdaClient();
  const food = normalizeUsdaFood(await usdaClient.getFoodById(normalizedFdcId));

  return foodCache.setDetail(normalizedFdcId, {
    food,
    nutritionFacts: food.nutrition,
    source: "USDA",
    sourceMode: "live",
  });
}
