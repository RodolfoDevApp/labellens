import type { ProductCacheRepository } from "@labellens/application";
import type { ProductProvider } from "./product-provider.js";
import type { ProductLookupResponse, ProductSearchResponse } from "./product-service-responses.js";

export type RefreshProductCacheCommandInput = {
  limit: number;
};

export type RefreshProductCacheCommandResult = {
  target: "product";
  requestedLimit: number;
  candidateCount: number;
  refreshedCount: number;
  skippedCount: number;
  failedCount: number;
  failures: Array<{ barcode: string; error: string }>;
};

export class RefreshProductCacheCommand {
  constructor(
    private readonly cache: ProductCacheRepository<ProductLookupResponse, ProductSearchResponse>,
    private readonly provider: ProductProvider,
  ) {}

  async execute(input: RefreshProductCacheCommandInput): Promise<RefreshProductCacheCommandResult> {
    const limit = Math.max(0, Math.floor(input.limit));
    const barcodes = await this.cache.listBarcodes(limit);
    const failures: Array<{ barcode: string; error: string }> = [];
    let refreshedCount = 0;
    let skippedCount = 0;

    for (const barcode of barcodes) {
      try {
        const refreshed = await this.provider.lookupProductByBarcode(barcode);

        if (!refreshed) {
          skippedCount += 1;
          continue;
        }

        await this.cache.setBarcode(barcode, refreshed);
        refreshedCount += 1;
      } catch (error) {
        failures.push({
          barcode,
          error: error instanceof Error ? error.message : "Unknown product cache refresh error.",
        });
      }
    }

    return {
      target: "product",
      requestedLimit: limit,
      candidateCount: barcodes.length,
      refreshedCount,
      skippedCount,
      failedCount: failures.length,
      failures,
    };
  }
}
