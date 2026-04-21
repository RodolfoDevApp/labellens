import type { LookupProductByBarcodeQuery } from "../application/lookup-product-by-barcode-query.js";
import type { SearchProductsQuery } from "../application/search-products-query.js";

export type ProductServiceUseCases = {
  lookupProductByBarcode: LookupProductByBarcodeQuery;
  searchProducts: SearchProductsQuery;
};

export type ProductServiceDependencies = {
  useCases: ProductServiceUseCases;
};
