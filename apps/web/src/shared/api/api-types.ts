import type {
  AuthConfirmationApiRequestContract,
  AuthSessionResponseContract,
  AuthUserContract,
  CurrentUserResponseContract,
  DeleteFavoriteItemResponseContract,
  DeleteMenuResponseContract,
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
  AuthSessionApiRequestContract,
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
export type AuthSessionResponseDto = AuthSessionResponseContract;
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

export type AuthSessionRequestDto = AuthSessionApiRequestContract;
export type AuthConfirmationRequestDto = AuthConfirmationApiRequestContract;

export type PasswordResetRequestDto = {
  email: string;
};

export type PasswordResetResponseDto = {
  nextStep: "reset-password";
  email: string;
  deliveryDestination?: string;
  deliveryMedium?: string;
  message: string;
};

export type PasswordResetConfirmRequestDto = {
  email: string;
  confirmationCode: string;
  password: string;
};

export type PasswordResetConfirmResponseDto = {
  message: string;
};
