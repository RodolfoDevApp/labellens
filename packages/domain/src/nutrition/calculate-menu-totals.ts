import type { MenuItem, MenuTotals } from "../menu/menu.js";
import { calculateNutritionForGrams } from "./calculate-nutrition.js";

type TotalKey = Exclude<keyof MenuTotals, "partialData">;

function round(value: number): number {
  return Number(value.toFixed(2));
}

function sum(values: Array<number | null | undefined>): number | null {
  const validValues = values.filter((value): value is number => typeof value === "number");

  if (validValues.length === 0) {
    return null;
  }

  return round(validValues.reduce((total, value) => total + value, 0));
}

export function calculateMenuTotals(items: MenuItem[]): MenuTotals {
  const calculatedItems = items.map((item) =>
    calculateNutritionForGrams(item.nutrition, item.grams),
  );

  const requiredKeys: TotalKey[] = ["energyKcal", "proteinG", "carbsG", "fatG"];

  const totals: MenuTotals = {
    energyKcal: sum(calculatedItems.map((item) => item.energyKcal)),
    proteinG: sum(calculatedItems.map((item) => item.proteinG)),
    carbsG: sum(calculatedItems.map((item) => item.carbsG)),
    fatG: sum(calculatedItems.map((item) => item.fatG)),
    sugarG: sum(calculatedItems.map((item) => item.sugarG)),
    fiberG: sum(calculatedItems.map((item) => item.fiberG)),
    sodiumMg: sum(calculatedItems.map((item) => item.sodiumMg)),
    partialData: false,
  };

  totals.partialData =
    items.some((item) => item.nutrition.completeness !== "COMPLETE") ||
    requiredKeys.some((key) => totals[key] === null);

  return totals;
}
