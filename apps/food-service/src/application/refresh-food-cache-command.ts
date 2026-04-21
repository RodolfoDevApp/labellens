import type { FoodCacheRepository } from "@labellens/application";
import type { FoodProvider } from "./food-provider.js";
import type { FoodDetailResponse, FoodSearchResponse } from "./food-service-responses.js";

export type RefreshFoodCacheCommandInput = {
  limit: number;
};

export type RefreshFoodCacheCommandResult = {
  target: "food";
  requestedLimit: number;
  candidateCount: number;
  refreshedCount: number;
  skippedCount: number;
  failedCount: number;
  failures: Array<{ fdcId: string; error: string }>;
};

export class RefreshFoodCacheCommand {
  constructor(
    private readonly cache: FoodCacheRepository<FoodSearchResponse, FoodDetailResponse>,
    private readonly provider: FoodProvider,
  ) {}

  async execute(input: RefreshFoodCacheCommandInput): Promise<RefreshFoodCacheCommandResult> {
    const limit = Math.max(0, Math.floor(input.limit));
    const fdcIds = await this.cache.listDetailIds(limit);
    const failures: Array<{ fdcId: string; error: string }> = [];
    let refreshedCount = 0;
    let skippedCount = 0;

    for (const fdcId of fdcIds) {
      try {
        const refreshed = await this.provider.getFoodById(fdcId);

        if (!refreshed) {
          skippedCount += 1;
          continue;
        }

        await this.cache.setDetail(fdcId, refreshed);
        refreshedCount += 1;
      } catch (error) {
        failures.push({
          fdcId,
          error: error instanceof Error ? error.message : "Unknown food cache refresh error.",
        });
      }
    }

    return {
      target: "food",
      requestedLimit: limit,
      candidateCount: fdcIds.length,
      refreshedCount,
      skippedCount,
      failedCount: failures.length,
      failures,
    };
  }
}
