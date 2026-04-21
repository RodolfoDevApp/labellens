import type { LookupProductByBarcodeQuery } from "../application/lookup-product-by-barcode-query.js";
import type { RefreshProductCacheCommand } from "../application/refresh-product-cache-command.js";
import type { SearchProductsQuery } from "../application/search-products-query.js";

export type ProductServiceUseCases = {
  lookupProductByBarcode: LookupProductByBarcodeQuery;
  refreshProductCache: RefreshProductCacheCommand;
  searchProducts: SearchProductsQuery;
};

export type ProductServiceDependencies = {
  useCases: ProductServiceUseCases;
};
