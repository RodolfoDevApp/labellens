import { API_BASE_URL } from "./api-base-url";
import { parseJsonResponse } from "./parse-json-response";
import type { FoodDetailResponseDto, FoodSearchResponseDto } from "./api-types";

export async function searchFoods(query: string, page = 1): Promise<FoodSearchResponseDto> {
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
