import type { FoodItem } from "@labellens/domain";
import { foodFixtures } from "../fixtures/food-fixtures.js";

export type FoodSearchResponse = {
  items: FoodItem[];
  source: "USDA";
};

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function searchFoods(query: string): FoodSearchResponse {
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery.length < 2) {
    return { items: [], source: "USDA" };
  }

  const items = foodFixtures
    .filter((food) => {
      const searchableValues = [
        food.name,
        food.brandName ?? "",
        food.dataType ?? "",
        ...food.searchAliases
      ].map(normalizeSearchText);

      return searchableValues.some((value) => value.includes(normalizedQuery));
    })
    .map(({ searchAliases: _searchAliases, ...food }) => food);

  return { items, source: "USDA" };
}
