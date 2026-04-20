import { API_BASE_URL } from "./api-base-url";
import { parseJsonResponse } from "./parse-json-response";
import type { ProductLookupResponseDto, ProductSearchResponseDto } from "./api-types";

export async function lookupProductBarcode(barcode: string): Promise<ProductLookupResponseDto> {
  const response = await fetch(new URL(`/api/v1/products/barcode/${barcode}`, API_BASE_URL));

  return parseJsonResponse<ProductLookupResponseDto>(response, "Product lookup failed");
}

export async function searchProducts(query: string): Promise<ProductSearchResponseDto> {
  const url = new URL("/api/v1/products/search", API_BASE_URL);
  url.searchParams.set("q", query);

  const response = await fetch(url);

  return parseJsonResponse<ProductSearchResponseDto>(response, "Product search failed");
}
