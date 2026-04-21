import type { FoodCacheRepository } from "@labellens/application";

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

export class InMemoryFoodCacheRepository<TSearchResult, TDetailResult>
  implements FoodCacheRepository<TSearchResult, TDetailResult>
{
  private readonly searchCache = new Map<string, CacheEntry<TSearchResult>>();
  private readonly detailCache = new Map<string, CacheEntry<TDetailResult>>();

  async getSearch(query: string, page: number): Promise<TSearchResult | null> {
    return get(this.searchCache, `${query.toLowerCase()}::${page}`);
  }

  async setSearch(
    query: string,
    page: number,
    value: TSearchResult,
  ): Promise<TSearchResult> {
    return set(this.searchCache, `${query.toLowerCase()}::${page}`, value);
  }

  async getDetail(fdcId: string): Promise<TDetailResult | null> {
    return get(this.detailCache, fdcId);
  }

  async setDetail(fdcId: string, value: TDetailResult): Promise<TDetailResult> {
    return set(this.detailCache, fdcId, value);
  }

  clear(): void {
    this.searchCache.clear();
    this.detailCache.clear();
  }
}
