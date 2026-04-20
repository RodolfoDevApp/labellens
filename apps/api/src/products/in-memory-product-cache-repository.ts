import type { ProductCacheRepository } from "@labellens/application";
import type { ProductItem } from "@labellens/domain";
import type { ProductLookupResponse } from "./product-service.js";

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

export class InMemoryProductCacheRepository
  implements ProductCacheRepository<ProductLookupResponse, ProductItem[]>
{
  private readonly barcodeCache = new Map<string, CacheRecord<ProductLookupResponse>>();
  private readonly searchCache = new Map<string, CacheRecord<ProductItem[]>>();

  async getBarcode(barcode: string): Promise<ProductLookupResponse | null> {
    return get(this.barcodeCache, barcode);
  }

  async setBarcode(barcode: string, value: ProductLookupResponse): Promise<ProductLookupResponse> {
    this.barcodeCache.set(barcode, {
      value,
      expiresAt: Date.now() + DEFAULT_TTL_MS,
    });

    return value;
  }

  async getSearch(query: string): Promise<ProductItem[] | null> {
    return get(this.searchCache, query.toLowerCase());
  }

  async setSearch(query: string, value: ProductItem[]): Promise<ProductItem[]> {
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
