import type { GetFoodByIdQuery } from "../application/get-food-by-id-query.js";
import type { SearchFoodsQuery } from "../application/search-foods-query.js";

export type FoodServiceUseCases = {
  getFoodById: GetFoodByIdQuery;
  searchFoods: SearchFoodsQuery;
};

export type FoodServiceDependencies = {
  useCases: FoodServiceUseCases;
};
