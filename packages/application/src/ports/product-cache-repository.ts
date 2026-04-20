export interface ProductCacheRepository<TLookupResult, TSearchResult> {
  getBarcode(barcode: string): Promise<TLookupResult | null>;
  setBarcode(barcode: string, value: TLookupResult): Promise<TLookupResult>;
  getSearch(query: string): Promise<TSearchResult | null>;
  setSearch(query: string, value: TSearchResult): Promise<TSearchResult>;
}
