import type { ProductLookupResponse, ProductSearchResponse } from "./product-service-responses.js";

export interface ProductProvider {
  lookupProductByBarcode(barcode: string): Promise<ProductLookupResponse | null>;
  searchProducts(query: string): Promise<ProductSearchResponse>;
}
