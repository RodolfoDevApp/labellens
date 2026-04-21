import type { NutritionFacts, ProductItem } from "@labellens/domain";

export type ProductSourceMode = "fixture" | "live";

export type ProductLookupResponse = {
  product: ProductItem;
  nutritionFacts: NutritionFacts;
  source: "OPEN_FOOD_FACTS";
  sourceMode: ProductSourceMode;
};

export type ProductSearchResponse = {
  items: ProductItem[];
  source: "OPEN_FOOD_FACTS";
  sourceMode: ProductSourceMode;
  queryUsed: string;
};
