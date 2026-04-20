export interface FoodCacheRepository<TSearchResult, TDetailResult> {
  getSearch(query: string, page: number): Promise<TSearchResult | null>;
  setSearch(query: string, page: number, value: TSearchResult): Promise<TSearchResult>;
  getDetail(fdcId: string): Promise<TDetailResult | null>;
  setDetail(fdcId: string, value: TDetailResult): Promise<TDetailResult>;
}
