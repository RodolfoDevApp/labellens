import type { NutritionFacts, ProductItem } from "@labellens/domain";

export type OpenFoodFactsProductResponse = {
  code?: string | number;
  status?: number;
  status_verbose?: string;
  product?: OpenFoodFactsProductPayload;
};

export type OpenFoodFactsProductPayload = {
  code?: string | number;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  image_front_small_url?: string;
  image_url?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  allergens_tags?: string[];
  additives_tags?: string[];
  nova_group?: number | string;
  nutrition_grades?: string;
  nutriscore_grade?: string;
  nutriments?: Record<string, unknown>;
};

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function round(value: number | null, decimals = 2): number | null {
  if (value === null) {
    return null;
  }

  return Number(value.toFixed(decimals));
}

function firstNumber(nutriments: Record<string, unknown> | undefined, keys: string[]): number | null {
  if (!nutriments) {
    return null;
  }

  for (const key of keys) {
    const value = numeric(nutriments[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function sodiumMgPer100g(nutriments: Record<string, unknown> | undefined): number | null {
  const sodiumG = firstNumber(nutriments, ["sodium_100g", "sodium"]);

  if (sodiumG !== null) {
    return round(sodiumG * 1000, 1);
  }

  const saltG = firstNumber(nutriments, ["salt_100g", "salt"]);

  if (saltG !== null) {
    return round(saltG * 393.4, 1);
  }

  return null;
}

function cleanTags(tags: string[] | undefined): string[] {
  if (!tags) {
    return [];
  }

  return tags
    .map((tag) => tag.replace(/^en:/i, "").replaceAll("-", " ").trim())
    .filter(Boolean);
}

function determineCompleteness(nutrition: Omit<NutritionFacts, "source" | "sourceId" | "lastFetchedAt" | "completeness">): NutritionFacts["completeness"] {
  const core = [
    nutrition.energyKcalPer100g,
    nutrition.proteinGPer100g,
    nutrition.carbsGPer100g,
    nutrition.fatGPer100g,
  ];

  if (core.every((value) => value !== null)) {
    const secondary = [nutrition.sugarGPer100g, nutrition.fiberGPer100g, nutrition.sodiumMgPer100g];

    return secondary.every((value) => value !== null) ? "COMPLETE" : "PARTIAL";
  }

  return core.some((value) => value !== null) ? "PARTIAL" : "LOW";
}

export function normalizeOpenFoodFactsProduct(
  payload: OpenFoodFactsProductResponse,
  barcode: string,
): ProductItem | null {
  if (payload.status === 0 || !payload.product) {
    return null;
  }

  const product = payload.product;
  const sourceId = String(product.code ?? payload.code ?? barcode);
  const nutriments = product.nutriments;
  const energyKcalPer100g = firstNumber(nutriments, [
    "energy-kcal_100g",
    "energy_kcal_100g",
    "energy-kcal",
  ]);
  const nutritionCore = {
    energyKcalPer100g: round(energyKcalPer100g, 1),
    proteinGPer100g: round(firstNumber(nutriments, ["proteins_100g", "proteins"])),
    carbsGPer100g: round(firstNumber(nutriments, ["carbohydrates_100g", "carbohydrates"])),
    fatGPer100g: round(firstNumber(nutriments, ["fat_100g", "fat"])),
    sugarGPer100g: round(firstNumber(nutriments, ["sugars_100g", "sugars"])),
    fiberGPer100g: round(firstNumber(nutriments, ["fiber_100g", "fiber"])),
    sodiumMgPer100g: sodiumMgPer100g(nutriments),
  };

  const nutrition: NutritionFacts = {
    ...nutritionCore,
    source: "OPEN_FOOD_FACTS",
    sourceId,
    lastFetchedAt: new Date().toISOString(),
    completeness: determineCompleteness(nutritionCore),
  };

  return {
    barcode: sourceId,
    name:
      product.product_name_en?.trim() ||
      product.product_name?.trim() ||
      product.generic_name?.trim() ||
      `Product ${sourceId}`,
    brand: product.brands?.split(",")[0]?.trim() || null,
    imageUrl: product.image_front_small_url ?? product.image_url ?? null,
    ingredientsText: product.ingredients_text_en ?? product.ingredients_text ?? null,
    allergens: cleanTags(product.allergens_tags),
    additives: cleanTags(product.additives_tags),
    novaGroup: numeric(product.nova_group),
    nutriScore: product.nutrition_grades ?? product.nutriscore_grade ?? null,
    nutrition,
  };
}
