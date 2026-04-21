import type { ProductCacheRepository } from "@labellens/application";

type CacheRecord<T> = {
  value: T;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 1000 * 60 * 30;

function get<T>(store: Map<string, CacheRecord<T>>, key: string): T | null {
  const record = store.get(key);

  if (!record) {
    return null;
  }

  if (record.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }

  return record.value;
}

export class InMemoryProductCacheRepository<TLookupResult, TSearchResult>
  implements ProductCacheRepository<TLookupResult, TSearchResult>
{
  private readonly barcodeCache = new Map<string, CacheRecord<TLookupResult>>();
  private readonly searchCache = new Map<string, CacheRecord<TSearchResult>>();

  async getBarcode(barcode: string): Promise<TLookupResult | null> {
    return get(this.barcodeCache, barcode);
  }

  async setBarcode(barcode: string, value: TLookupResult): Promise<TLookupResult> {
    this.barcodeCache.set(barcode, {
      value,
      expiresAt: Date.now() + DEFAULT_TTL_MS,
    });

    return value;
  }

  async getSearch(query: string): Promise<TSearchResult | null> {
    return get(this.searchCache, query.toLowerCase());
  }

  async setSearch(query: string, value: TSearchResult): Promise<TSearchResult> {
    this.searchCache.set(query.toLowerCase(), {
      value,
      expiresAt: Date.now() + DEFAULT_TTL_MS,
    });

    return value;
  }

  clear(): void {
    this.barcodeCache.clear();
    this.searchCache.clear();
  }
}
