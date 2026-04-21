export function productBarcodePkPrefix(): "PRODUCT#OFF#" {
  return "PRODUCT#OFF#";
}

export function productBarcodeCacheKey(barcode: string): { PK: string; SK: string } {
  return {
    PK: `${productBarcodePkPrefix()}${barcode}`,
    SK: "DETAIL",
  };
}

export function productSearchCacheKey(query: string): { PK: string; SK: string } {
  return {
    PK: `CACHE#PRODUCT#SEARCH#${query.toLowerCase()}`,
    SK: "DETAIL",
  };
}
