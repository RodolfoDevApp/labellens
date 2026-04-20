export function productBarcodeCacheKey(barcode: string): { PK: string; SK: string } {
  return {
    PK: `PRODUCT#OFF#${barcode}`,
    SK: "DETAIL",
  };
}

export function productSearchCacheKey(query: string): { PK: string; SK: string } {
  return {
    PK: `CACHE#PRODUCT#SEARCH#${query.toLowerCase()}`,
    SK: "DETAIL",
  };
}
