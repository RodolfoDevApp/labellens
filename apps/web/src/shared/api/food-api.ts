import { createApiUrl } from "./api-base-url";
import { parseJsonResponse } from "./parse-json-response";
import type { FoodDetailResponseDto, FoodSearchResponseDto } from "./api-types";

export async function searchFoods(query: string, page = 1): Promise<FoodSearchResponseDto> {
  const url = await createApiUrl("/api/v1/foods/search");
  url.searchParams.set("q", query);
  url.searchParams.set("page", String(page));

  const response = await fetch(url);

  return parseJsonResponse<FoodSearchResponseDto>(response, "Food search failed");
}

export async function getFoodById(fdcId: string): Promise<FoodDetailResponseDto> {
  const response = await fetch(await createApiUrl(`/api/v1/foods/${fdcId}`));

  return parseJsonResponse<FoodDetailResponseDto>(response, "Food detail failed");
}
