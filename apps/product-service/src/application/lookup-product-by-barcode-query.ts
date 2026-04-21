import type { ProductCacheRepository } from "@labellens/application";
import type { ProductProvider } from "./product-provider.js";
import type {
  ProductLookupResponse,
  ProductSearchResponse,
  ProductSourceMode,
} from "./product-service-responses.js";

export class LookupProductByBarcodeQuery {
  constructor(
    private readonly sourceMode: ProductSourceMode,
    private readonly cache: ProductCacheRepository<ProductLookupResponse, ProductSearchResponse>,
    private readonly provider: ProductProvider,
  ) {}

  async execute(barcode: string): Promise<ProductLookupResponse | null> {
    const cached = await this.cache.getBarcode(barcode);

    if (cached) {
      return cached;
    }

    const result = await this.provider.lookupProductByBarcode(barcode);

    if (!result) {
      return null;
    }

    const normalizedResult = {
      ...result,
      sourceMode: this.sourceMode,
    } satisfies ProductLookupResponse;

    return this.cache.setBarcode(barcode, normalizedResult);
  }
}
