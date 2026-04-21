import type { GetFoodByIdQuery } from "../application/get-food-by-id-query.js";
import type { RefreshFoodCacheCommand } from "../application/refresh-food-cache-command.js";
import type { SearchFoodsQuery } from "../application/search-foods-query.js";

export type FoodServiceUseCases = {
  getFoodById: GetFoodByIdQuery;
  refreshFoodCache: RefreshFoodCacheCommand;
  searchFoods: SearchFoodsQuery;
};

export type FoodServiceDependencies = {
  useCases: FoodServiceUseCases;
};
