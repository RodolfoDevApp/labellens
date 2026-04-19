import type { ProductItem } from "@labellens/domain";
import type { ProductLookupResponse } from "./product-service.js";

type CacheRecord<T> = {
  value: T;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 1000 * 60 * 30;

class ProductCache {
  private readonly barcodeCache = new Map<string, CacheRecord<ProductLookupResponse>>();
  private readonly searchCache = new Map<string, CacheRecord<ProductItem[]>>();

  getBarcode(barcode: string): ProductLookupResponse | null {
    return this.get(this.barcodeCache, barcode);
  }

  setBarcode(barcode: string, value: ProductLookupResponse): ProductLookupResponse {
    this.barcodeCache.set(barcode, {
      value,
      expiresAt: Date.now() + DEFAULT_TTL_MS,
    });

    return value;
  }

  getSearch(query: string): ProductItem[] | null {
    return this.get(this.searchCache, query.toLowerCase());
  }

  setSearch(query: string, value: ProductItem[]): ProductItem[] {
    this.searchCache.set(query.toLowerCase(), {
      value,
      expiresAt: Date.now() + DEFAULT_TTL_MS,
    });

    return value;
  }

  private get<T>(store: Map<string, CacheRecord<T>>, key: string): T | null {
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
}

export const productCache = new ProductCache();
