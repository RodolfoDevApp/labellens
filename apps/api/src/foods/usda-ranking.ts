import type { UsdaSearchFood } from "./usda/usda-client.js";

const preferredDataTypeScore = new Map<string, number>([
  ["Foundation", 40],
  ["SR Legacy", 35],
  ["Survey (FNDDS)", 20],
  ["Branded", 5]
]);

const penaltyWords = [
  "milk",
  "beverage",
  "oil",
  "soup",
  "roll",
  "cookie",
  "bar",
  "cereal",
  "babyfood",
  "flavored",
  "mix",
  "drink"
];

const preferredByQuery = new Map<string, string[]>([
  ["oats", ["oats", "oat", "raw", "rolled"]],
  ["chicken", ["chicken", "breast", "raw", "roasted"]],
  ["milk", ["milk", "whole", "fluid"]],
  ["egg", ["egg", "whole", "raw"]],
  ["rice", ["rice", "white", "brown", "cooked"]],
  ["banana", ["banana", "raw"]],
  ["apple", ["apple", "raw"]],
  ["potato", ["potato", "raw", "baked"]],
  ["beans", ["beans", "cooked"]]
]);

function normalize(value: string): string {
  return value.toLowerCase();
}

function scoreFood(food: UsdaSearchFood, translatedQuery: string): number {
  const name = normalize(food.description);
  const query = normalize(translatedQuery);
  let score = 0;

  if (name === query) score += 100;
  if (name.startsWith(query)) score += 70;
  if (name.includes(query)) score += 45;

  const preferredWords = preferredByQuery.get(query) ?? [];

  for (const word of preferredWords) {
    if (name.includes(word)) score += 12;
  }

  for (const word of penaltyWords) {
    if (name.includes(word) && !preferredWords.includes(word)) {
      score -= 18;
    }
  }

  score += preferredDataTypeScore.get(food.dataType ?? "") ?? 0;

  if (food.brandName || food.brandOwner) {
    score -= 10;
  }

  return score;
}

export function rankUsdaFoods(
  foods: UsdaSearchFood[],
  translatedQuery: string,
): UsdaSearchFood[] {
  return [...foods].sort((left, right) => {
    const rightScore = scoreFood(right, translatedQuery);
    const leftScore = scoreFood(left, translatedQuery);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return left.description.localeCompare(right.description);
  });
}
