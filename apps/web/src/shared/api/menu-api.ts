import { createApiUrl } from "./api-base-url";
import { authHeaders } from "./auth-headers";
import { parseJsonResponse } from "./parse-json-response";
import type {
  DeleteMenuResponseDto,
  MenuCalculationItemDto,
  MenuCalculationResponseDto,
  SavedMenusResponseDto,
  SaveMenuRequestDto,
  SaveMenuResponseDto,
} from "./api-types";

export async function calculateMenu(items: MenuCalculationItemDto[]): Promise<MenuCalculationResponseDto> {
  const response = await fetch(await createApiUrl("/api/v1/menus/calculate"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });

  return parseJsonResponse<MenuCalculationResponseDto>(response, "Menu calculation failed");
}

export async function saveMenuDraft(accessToken: string, menu: SaveMenuRequestDto): Promise<SaveMenuResponseDto> {
  const response = await fetch(await createApiUrl("/api/v1/menus"), {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(menu),
  });

  return parseJsonResponse<SaveMenuResponseDto>(response, "Menu save failed");
}

export async function updateSavedMenu(
  accessToken: string,
  menuId: string,
  menu: SaveMenuRequestDto,
): Promise<SaveMenuResponseDto> {
  const response = await fetch(await createApiUrl(`/api/v1/menus/${menuId}`), {
    method: "PUT",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(menu),
  });

  return parseJsonResponse<SaveMenuResponseDto>(response, "Menu update failed");
}

export async function listSavedMenus(accessToken: string): Promise<SavedMenusResponseDto> {
  const response = await fetch(await createApiUrl("/api/v1/menus"), {
    headers: authHeaders(accessToken),
  });

  return parseJsonResponse<SavedMenusResponseDto>(response, "Saved menus lookup failed");
}

export async function deleteSavedMenu(accessToken: string, menuId: string): Promise<DeleteMenuResponseDto> {
  const response = await fetch(await createApiUrl(`/api/v1/menus/${menuId}`), {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });

  return parseJsonResponse<DeleteMenuResponseDto>(response, "Menu delete failed");
}
