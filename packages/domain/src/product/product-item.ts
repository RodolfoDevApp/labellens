import type { NutritionFacts } from "../nutrition/nutrition-facts.js";

export type ProductItem = {
  barcode: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  ingredientsText?: string | null;
  allergens: string[];
  additives: string[];
  novaGroup?: number | null;
  nutriScore?: string | null;
  nutrition: NutritionFacts;
};
