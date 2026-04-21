import type { FoodCacheRepository } from "@labellens/application";
import type { FoodProvider } from "./food-provider.js";
import type { FoodDetailResponse, FoodSearchResponse } from "./food-service-responses.js";

export type SearchFoodsQueryInput = {
  query: string;
  page: number;
};

export class SearchFoodsQuery {
  constructor(
    private readonly cache: FoodCacheRepository<FoodSearchResponse, FoodDetailResponse>,
    private readonly provider: FoodProvider,
  ) {}

  async execute(input: SearchFoodsQueryInput): Promise<FoodSearchResponse> {
    const cached = await this.cache.getSearch(input.query, input.page);

    if (cached) {
      return cached;
    }

    const result = await this.provider.searchFoods(input.query, input.page);
    return this.cache.setSearch(input.query, input.page, result);
  }
}
