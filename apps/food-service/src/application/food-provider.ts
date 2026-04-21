import type { FoodDetailResponse, FoodSearchResponse } from "./food-service-responses.js";

export interface FoodProvider {
  searchFoods(query: string, page?: number): Promise<FoodSearchResponse>;
  getFoodById(fdcId: string): Promise<FoodDetailResponse | null>;
}
