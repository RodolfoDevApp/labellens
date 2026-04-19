export type NutritionFactsDto = {
  energyKcalPer100g: number | null;
  proteinGPer100g: number | null;
  carbsGPer100g: number | null;
  fatGPer100g: number | null;
  sugarGPer100g?: number | null;
  fiberGPer100g?: number | null;
  sodiumMgPer100g?: number | null;
  source: "USDA" | "OPEN_FOOD_FACTS";
  sourceId: string;
  lastFetchedAt: string;
  completeness: "COMPLETE" | "PARTIAL" | "LOW";
};

export type FoodItemDto = {
  id: string;
  name: string;
  brandName?: string | null;
  dataType?: string | null;
  servingSize?: number | null;
  servingSizeUnit?: string | null;
  nutrition: NutritionFactsDto;
};

export type ProductItemDto = {
  barcode: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  ingredientsText?: string | null;
  allergens: string[];
  additives: string[];
  novaGroup?: number | null;
  nutriScore?: string | null;
  nutrition: NutritionFactsDto;
};

export type FoodSearchResponseDto = {
  items: FoodItemDto[];
  source: "USDA";
  sourceMode: "live" | "fixture";
  queryUsed: string;
  page: number;
};

export type FoodDetailResponseDto = {
  food: FoodItemDto;
  nutritionFacts: NutritionFactsDto;
  source: "USDA";
  sourceMode: "live" | "fixture";
};

export type ProductLookupResponseDto = {
  product: ProductItemDto;
  source: "OPEN_FOOD_FACTS";
  sourceMode: "live" | "fixture";
};

export type ProductSearchResponseDto = {
  items: ProductItemDto[];
  source: "OPEN_FOOD_FACTS";
  sourceMode: "live" | "fixture";
  queryUsed: string;
};

export type MenuTotalsDto = {
  energyKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  sugarG?: number | null;
  fiberG?: number | null;
  sodiumMg?: number | null;
  partialData: boolean;
};

export type MenuCalculationItemDto = {
  id: string;
  source: "USDA" | "OPEN_FOOD_FACTS" | "CUSTOM_RECIPE";
  sourceId: string;
  displayName: string;
  grams: number;
  nutrition: NutritionFactsDto;
};

export type MenuCalculationResponseDto = {
  totals: MenuTotalsDto;
  partialData: boolean;
  warnings: Array<{
    code: string;
    message: string;
    itemId?: string;
  }>;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const details = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(details?.detail ?? `${fallbackMessage} with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function searchFoods(
  query: string,
  page = 1,
): Promise<FoodSearchResponseDto> {
  const url = new URL("/api/v1/foods/search", API_BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("page", String(page));

  const response = await fetch(url);

  return parseJsonResponse<FoodSearchResponseDto>(response, "Food search failed");
}

export async function getFoodById(fdcId: string): Promise<FoodDetailResponseDto> {
  const response = await fetch(new URL(`/api/v1/foods/${fdcId}`, API_BASE_URL));

  return parseJsonResponse<FoodDetailResponseDto>(response, "Food detail failed");
}

export async function lookupProductBarcode(barcode: string): Promise<ProductLookupResponseDto> {
  const response = await fetch(new URL(`/api/v1/products/barcode/${barcode}`, API_BASE_URL));

  return parseJsonResponse<ProductLookupResponseDto>(response, "Product lookup failed");
}

export async function searchProducts(query: string): Promise<ProductSearchResponseDto> {
  const url = new URL("/api/v1/products/search", API_BASE_URL);
  url.searchParams.set("q", query);

  const response = await fetch(url);

  return parseJsonResponse<ProductSearchResponseDto>(response, "Product search failed");
}

export async function calculateMenu(
  items: MenuCalculationItemDto[],
): Promise<MenuCalculationResponseDto> {
  const response = await fetch(new URL("/api/v1/menus/calculate", API_BASE_URL), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });

  return parseJsonResponse<MenuCalculationResponseDto>(response, "Menu calculation failed");
}
