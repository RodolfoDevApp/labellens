import { createApiUrl } from "./api-base-url";
import { authHeaders } from "./auth-headers";
import { parseJsonResponse } from "./parse-json-response";
import type {
  DeleteFavoriteItemResponseDto,
  FavoriteItemResponseDto,
  FavoritesResponseDto,
  SaveFavoriteRequestDto,
} from "./api-types";

export async function saveFavoriteFood(
  accessToken: string,
  item: SaveFavoriteRequestDto,
): Promise<FavoriteItemResponseDto> {
  const response = await fetch(await createApiUrl("/api/v1/favorites"), {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(item),
  });

  return parseJsonResponse<FavoriteItemResponseDto>(response, "Favorite save failed");
}

export async function listFavoriteFoods(accessToken: string): Promise<FavoritesResponseDto> {
  const response = await fetch(await createApiUrl("/api/v1/favorites"), {
    headers: authHeaders(accessToken),
  });

  return parseJsonResponse<FavoritesResponseDto>(response, "Favorite lookup failed");
}

export async function deleteFavoriteFood(
  accessToken: string,
  favoriteItemId: string,
): Promise<DeleteFavoriteItemResponseDto> {
  const response = await fetch(await createApiUrl(`/api/v1/favorites/${favoriteItemId}`), {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });

  return parseJsonResponse<DeleteFavoriteItemResponseDto>(response, "Favorite delete failed");
}
