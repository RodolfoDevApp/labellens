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

export type FoodSearchResponseDto = {
  items: FoodItemDto[];
  source: "USDA";
  sourceMode: "live" | "fixture";
  queryUsed: string;
  page: number;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function searchFoods(
  query: string,
  page = 1,
): Promise<FoodSearchResponseDto> {
  const url = new URL("/api/v1/foods/search", API_BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("page", String(page));

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Food search failed with status ${response.status}`);
  }

  return response.json() as Promise<FoodSearchResponseDto>;
}
