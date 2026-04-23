import { createApiUrl } from "./api-base-url";
import { parseJsonResponse } from "./parse-json-response";
import type { ProductLookupResponseDto, ProductSearchResponseDto } from "./api-types";

export async function lookupProductBarcode(barcode: string): Promise<ProductLookupResponseDto> {
  const response = await fetch(await createApiUrl(`/api/v1/products/barcode/${barcode}`));

  return parseJsonResponse<ProductLookupResponseDto>(response, "Product lookup failed");
}

export async function searchProducts(query: string): Promise<ProductSearchResponseDto> {
  const url = await createApiUrl("/api/v1/products/search");
  url.searchParams.set("q", query);

  const response = await fetch(url);

  return parseJsonResponse<ProductSearchResponseDto>(response, "Product search failed");
}
