import { createApiUrl } from "./api-base-url";
import { authHeaders } from "./auth-headers";
import { parseJsonResponse } from "./parse-json-response";
import type { AuthUserDto, CurrentUserResponseDto, DemoLoginRequestDto, DemoLoginResponseDto } from "./api-types";

export async function demoLogin(credentials: DemoLoginRequestDto): Promise<DemoLoginResponseDto> {
  const fallbackName = credentials.email.trim().split("@")[0]?.trim() || "Demo user";

  const displayName =
    credentials.mode === "register" && credentials.displayName?.trim()
      ? credentials.displayName.trim()
      : fallbackName;

  const response = await fetch(await createApiUrl("/api/v1/auth/demo-login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ displayName }),
  });

  return parseJsonResponse<DemoLoginResponseDto>(response, "Login failed");
}

export async function getCurrentUser(accessToken: string): Promise<CurrentUserResponseDto> {
  const response = await fetch(await createApiUrl("/api/v1/auth/me"), {
    headers: authHeaders(accessToken),
  });

  return parseJsonResponse<{ user: AuthUserDto }>(response, "Current user lookup failed");
}
