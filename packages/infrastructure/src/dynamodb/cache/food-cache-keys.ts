export function foodSearchCacheKey(query: string, page: number): { PK: string; SK: string } {
  return {
    PK: `CACHE#FOOD#SEARCH#${query.toLowerCase()}#${page}`,
    SK: "DETAIL",
  };
}

export function foodDetailCacheKey(fdcId: string): { PK: string; SK: string } {
  return {
    PK: `FOOD#USDA#${fdcId}`,
    SK: "DETAIL",
  };
}
