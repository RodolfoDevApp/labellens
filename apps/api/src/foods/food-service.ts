import type { FoodItem } from "@labellens/domain";
import { foodFixtures } from "../fixtures/food-fixtures.js";

export type FoodSearchResponse = {
  items: FoodItem[];
  source: "USDA";
};

export function searchFoods(query: string): FoodSearchResponse {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length < 2) {
    return { items: [], source: "USDA" };
  }

  const items = foodFixtures.filter((food) =>
    food.name.toLowerCase().includes(normalizedQuery),
  );

  return { items, source: "USDA" };
}
