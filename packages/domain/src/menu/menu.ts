import type { NutritionFacts } from "../nutrition/nutrition-facts.js";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type MenuItemSource = "USDA" | "OPEN_FOOD_FACTS";

export type MenuItem = {
  id: string;
  source: MenuItemSource;
  sourceId: string;
  displayName: string;
  grams: number;
  nutrition: NutritionFacts;
};

export type MenuMeal = {
  type: MealType;
  items: MenuItem[];
};

export type MenuTotals = {
  energyKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  sugarG?: number | null;
  fiberG?: number | null;
  sodiumMg?: number | null;
  partialData: boolean;
};

export type Menu = {
  id: string;
  name: string;
  date: string;
  meals: MenuMeal[];
  totals: MenuTotals;
};
