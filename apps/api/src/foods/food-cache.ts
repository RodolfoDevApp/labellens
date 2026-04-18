import type { FoodDetailResponse, FoodSearchResponse } from "./food-service.js";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;
const searchCache = new Map<string, CacheEntry<FoodSearchResponse>>();
const detailCache = new Map<string, CacheEntry<FoodDetailResponse>>();

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

export const foodCache = {
  getSearch(query: string, page: number): FoodSearchResponse | null {
    return get(searchCache, `${query.toLowerCase()}::${page}`);
  },

  setSearch(query: string, page: number, value: FoodSearchResponse): FoodSearchResponse {
    return set(searchCache, `${query.toLowerCase()}::${page}`, value);
  },

  getDetail(fdcId: string): FoodDetailResponse | null {
    return get(detailCache, fdcId);
  },

  setDetail(fdcId: string, value: FoodDetailResponse): FoodDetailResponse {
    return set(detailCache, fdcId, value);
  },
};
