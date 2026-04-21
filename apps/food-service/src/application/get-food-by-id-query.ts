import type { FoodCacheRepository } from "@labellens/application";
import type { FoodProvider } from "./food-provider.js";
import type { FoodDetailResponse, FoodSearchResponse } from "./food-service-responses.js";

export class GetFoodByIdQuery {
  constructor(
    private readonly cache: FoodCacheRepository<FoodSearchResponse, FoodDetailResponse>,
    private readonly provider: FoodProvider,
  ) {}

  async execute(fdcId: string): Promise<FoodDetailResponse | null> {
    const cached = await this.cache.getDetail(fdcId);

    if (cached) {
      return cached;
    }

    const result = await this.provider.getFoodById(fdcId);

    if (!result) {
      return null;
    }

    return this.cache.setDetail(fdcId, result);
  }
}
