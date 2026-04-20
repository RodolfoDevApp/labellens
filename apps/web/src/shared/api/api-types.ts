import type {
  AuthUserContract,
  CurrentUserResponseContract,
  DeleteFavoriteItemResponseContract,
  DeleteMenuResponseContract,
  DemoLoginResponseContract,
  FavoriteItemContract,
  FavoriteItemResponseContract,
  FavoritesResponseContract,
  FoodDetailResponseContract,
  FoodItemContract,
  FoodSearchResponseContract,
  MenuCalculationItemContract,
  MenuCalculationResponseContract,
  MenuTotalsContract,
  NutritionFactsContract,
  ProductItemContract,
  ProductLookupResponseContract,
  ProductSearchResponseContract,
  SaveFavoriteApiRequestContract,
  SaveMenuApiRequestContract,
  SaveMenuResponseContract,
  SavedMenuContract,
  SavedMenusResponseContract,
} from "@labellens/contracts";

export type NutritionFactsDto = NutritionFactsContract;
export type FoodItemDto = FoodItemContract;
export type ProductItemDto = ProductItemContract;
export type FoodSearchResponseDto = FoodSearchResponseContract;
export type FoodDetailResponseDto = FoodDetailResponseContract;
export type ProductLookupResponseDto = ProductLookupResponseContract;
export type ProductSearchResponseDto = ProductSearchResponseContract;
export type MenuTotalsDto = MenuTotalsContract;
export type MenuCalculationItemDto = MenuCalculationItemContract;
export type MenuCalculationResponseDto = MenuCalculationResponseContract;
export type AuthUserDto = AuthUserContract;
export type DemoLoginResponseDto = DemoLoginResponseContract;
export type CurrentUserResponseDto = CurrentUserResponseContract;
export type SaveMenuRequestDto = SaveMenuApiRequestContract;
export type SaveMenuResponseDto = SaveMenuResponseContract;
export type SavedMenuDto = SavedMenuContract;
export type SavedMenusResponseDto = SavedMenusResponseContract;
export type DeleteMenuResponseDto = DeleteMenuResponseContract;
export type FavoriteItemDto = FavoriteItemContract;
export type SaveFavoriteRequestDto = SaveFavoriteApiRequestContract;
export type FavoriteItemResponseDto = FavoriteItemResponseContract;
export type FavoritesResponseDto = FavoritesResponseContract;
export type DeleteFavoriteItemResponseDto = DeleteFavoriteItemResponseContract;

export type AuthModeDto = "login" | "register";

export type DemoLoginRequestDto = {
  mode: AuthModeDto;
  email: string;
  password: string;
  displayName?: string;
};
