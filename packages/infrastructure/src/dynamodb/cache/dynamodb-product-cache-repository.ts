import type { ProductCacheRepository } from "@labellens/application";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { DynamoDbTableName } from "../table-name.js";
import { DynamoDbJsonCache } from "./dynamodb-json-cache.js";
import { productBarcodeCacheKey, productSearchCacheKey } from "./product-cache-keys.js";

const PRODUCT_CACHE_TTL_SECONDS = 30 * 60;

export class DynamoDbProductCacheRepository<TLookupResult, TSearchResult>
  implements ProductCacheRepository<TLookupResult, TSearchResult>
{
  private readonly barcodeCache: DynamoDbJsonCache<TLookupResult>;
  private readonly searchCache: DynamoDbJsonCache<TSearchResult>;

  constructor(client: DynamoDBDocumentClient, tableName: DynamoDbTableName) {
    this.barcodeCache = new DynamoDbJsonCache<TLookupResult>(
      client,
      tableName,
      PRODUCT_CACHE_TTL_SECONDS,
    );
    this.searchCache = new DynamoDbJsonCache<TSearchResult>(
      client,
      tableName,
      PRODUCT_CACHE_TTL_SECONDS,
    );
  }

  async getBarcode(barcode: string): Promise<TLookupResult | null> {
    return this.barcodeCache.get(productBarcodeCacheKey(barcode));
  }

  async setBarcode(barcode: string, value: TLookupResult): Promise<TLookupResult> {
    return this.barcodeCache.set(productBarcodeCacheKey(barcode), value);
  }

  async getSearch(query: string): Promise<TSearchResult | null> {
    return this.searchCache.get(productSearchCacheKey(query));
  }

  async setSearch(query: string, value: TSearchResult): Promise<TSearchResult> {
    return this.searchCache.set(productSearchCacheKey(query), value);
  }
}
