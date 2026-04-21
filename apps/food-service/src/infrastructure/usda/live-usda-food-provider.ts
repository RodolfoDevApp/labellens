import type { FoodProvider } from "../../application/food-provider.js";
import type { FoodDetailResponse, FoodSearchResponse } from "../../application/food-service-responses.js";
import { normalizeUsdaFood, normalizeUsdaSearchFood } from "./usda-normalizer.js";
import { rankUsdaFoods } from "./usda-ranking.js";
import type { UsdaClient } from "./usda-client.js";

export class LiveUsdaFoodProvider implements FoodProvider {
  constructor(private readonly usdaClient: UsdaClient) {}

  async searchFoods(query: string, page = 1): Promise<FoodSearchResponse> {
    const response = await this.usdaClient.searchFoods(query, page);

    return {
      items: rankUsdaFoods(response.foods ?? [], query)
        .slice(0, 10)
        .map(normalizeUsdaSearchFood),
      source: "USDA",
      sourceMode: "live",
      queryUsed: query,
    };
  }

  async getFoodById(fdcId: string): Promise<FoodDetailResponse> {
    const food = normalizeUsdaFood(await this.usdaClient.getFoodById(fdcId));

    return {
      food,
      nutritionFacts: food.nutrition,
      source: "USDA",
      sourceMode: "live",
    };
  }
}
