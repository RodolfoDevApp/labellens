import type { EventPublisher, FoodCacheRepository } from "@labellens/application";
import { createFoodSearchedEvent } from "@labellens/application";
import type { FoodProvider } from "./food-provider.js";
import type { FoodDetailResponse, FoodSearchResponse } from "./food-service-responses.js";

export type SearchFoodsQueryInput = {
  query: string;
  page: number;
  correlationId: string;
};

export class SearchFoodsQuery {
  constructor(
    private readonly cache: FoodCacheRepository<FoodSearchResponse, FoodDetailResponse>,
    private readonly provider: FoodProvider,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(input: SearchFoodsQueryInput): Promise<FoodSearchResponse> {
    const cached = await this.cache.getSearch(input.query, input.page);

    if (cached) {
      this.publishFoodSearched(input, cached);
      return cached;
    }

    const result = await this.provider.searchFoods(input.query, input.page);
    const saved = await this.cache.setSearch(input.query, input.page, result);

    this.publishFoodSearched(input, saved);

    return saved;
  }

  private publishFoodSearched(input: SearchFoodsQueryInput, result: FoodSearchResponse): void {
    void this.eventPublisher?.publish(
      createFoodSearchedEvent({
        query: input.query,
        page: input.page,
        resultCount: result.items.length,
        sourceMode: result.sourceMode,
        correlationId: input.correlationId,
      }),
    );
  }
}
