import type { NutritionFacts } from "../nutrition/nutrition-facts.js";

export type FoodItem = {
  id: string;
  name: string;
  brandName?: string | null;
  dataType?: string | null;
  servingSize?: number | null;
  servingSizeUnit?: string | null;
  nutrition: NutritionFacts;
};
