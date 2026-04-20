import type { FoodCacheRepository } from "@labellens/application";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { DynamoDbTableName } from "../table-name.js";
import { DynamoDbJsonCache } from "./dynamodb-json-cache.js";
import { foodDetailCacheKey, foodSearchCacheKey } from "./food-cache-keys.js";

const FOOD_CACHE_TTL_SECONDS = 6 * 60 * 60;

export class DynamoDbFoodCacheRepository<TSearchResult, TDetailResult>
  implements FoodCacheRepository<TSearchResult, TDetailResult>
{
  private readonly searchCache: DynamoDbJsonCache<TSearchResult>;
  private readonly detailCache: DynamoDbJsonCache<TDetailResult>;

  constructor(client: DynamoDBDocumentClient, tableName: DynamoDbTableName) {
    this.searchCache = new DynamoDbJsonCache<TSearchResult>(
      client,
      tableName,
      FOOD_CACHE_TTL_SECONDS,
    );
    this.detailCache = new DynamoDbJsonCache<TDetailResult>(
      client,
      tableName,
      FOOD_CACHE_TTL_SECONDS,
    );
  }

  async getSearch(query: string, page: number): Promise<TSearchResult | null> {
    return this.searchCache.get(foodSearchCacheKey(query, page));
  }

  async setSearch(query: string, page: number, value: TSearchResult): Promise<TSearchResult> {
    return this.searchCache.set(foodSearchCacheKey(query, page), value);
  }

  async getDetail(fdcId: string): Promise<TDetailResult | null> {
    return this.detailCache.get(foodDetailCacheKey(fdcId));
  }

  async setDetail(fdcId: string, value: TDetailResult): Promise<TDetailResult> {
    return this.detailCache.set(foodDetailCacheKey(fdcId), value);
  }
}
