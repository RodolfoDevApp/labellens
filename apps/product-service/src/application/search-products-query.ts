import type { ProductCacheRepository } from "@labellens/application";
import type { ProductProvider } from "./product-provider.js";
import type {
  ProductLookupResponse,
  ProductSearchResponse,
  ProductSourceMode,
} from "./product-service-responses.js";

export class SearchProductsQuery {
  constructor(
    private readonly sourceMode: ProductSourceMode,
    private readonly cache: ProductCacheRepository<ProductLookupResponse, ProductSearchResponse>,
    private readonly provider: ProductProvider,
  ) {}

  async execute(query: string): Promise<ProductSearchResponse> {
    const cached = await this.cache.getSearch(query);

    if (cached) {
      return cached;
    }

    const result = await this.provider.searchProducts(query);
    const normalizedResult = {
      ...result,
      sourceMode: this.sourceMode,
    } satisfies ProductSearchResponse;

    return this.cache.setSearch(query, normalizedResult);
  }
}
