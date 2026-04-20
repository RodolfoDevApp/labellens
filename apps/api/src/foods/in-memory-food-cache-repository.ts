import type { FoodCacheRepository } from "@labellens/application";
import type { FoodDetailResponse, FoodSearchResponse } from "./food-service.js";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;

function now(): number {
  return Date.now();
}

function get<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function set<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): T {
  cache.set(key, {
    value,
    expiresAt: now() + DEFAULT_TTL_MS,
  });

  return value;
}

export class InMemoryFoodCacheRepository
  implements FoodCacheRepository<FoodSearchResponse, FoodDetailResponse>
{
  private readonly searchCache = new Map<string, CacheEntry<FoodSearchResponse>>();
  private readonly detailCache = new Map<string, CacheEntry<FoodDetailResponse>>();

  async getSearch(query: string, page: number): Promise<FoodSearchResponse | null> {
    return get(this.searchCache, `${query.toLowerCase()}::${page}`);
  }

  async setSearch(
    query: string,
    page: number,
    value: FoodSearchResponse,
  ): Promise<FoodSearchResponse> {
    return set(this.searchCache, `${query.toLowerCase()}::${page}`, value);
  }

  async getDetail(fdcId: string): Promise<FoodDetailResponse | null> {
    return get(this.detailCache, fdcId);
  }

  async setDetail(fdcId: string, value: FoodDetailResponse): Promise<FoodDetailResponse> {
    return set(this.detailCache, fdcId, value);
  }

  clear(): void {
    this.searchCache.clear();
    this.detailCache.clear();
  }
}
