import { createApiUrl } from "./api-base-url";
import { authHeaders } from "./auth-headers";
import { parseJsonResponse } from "./parse-json-response";
import type {
  AuthConfirmationRequestDto,
  AuthSessionRequestDto,
  AuthSessionResponseDto,
  AuthUserDto,
  CurrentUserResponseDto,
  PasswordResetConfirmRequestDto,
  PasswordResetConfirmResponseDto,
  PasswordResetRequestDto,
  PasswordResetResponseDto,
} from "./api-types";

export async function createSession(credentials: AuthSessionRequestDto): Promise<AuthSessionResponseDto> {
  const normalizedEmail = credentials.email.trim().toLowerCase();
  const displayName = credentials.displayName?.trim();

  const response = await fetch(await createApiUrl("/api/v1/auth/session"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: credentials.mode,
      email: normalizedEmail,
      password: credentials.password,
      ...(displayName ? { displayName } : {}),
    }),
  });

  return parseJsonResponse<AuthSessionResponseDto>(response, "Session start failed");
}

export async function confirmSession(credentials: AuthConfirmationRequestDto): Promise<AuthSessionResponseDto> {
  const response = await fetch(await createApiUrl("/api/v1/auth/confirm"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
      confirmationCode: credentials.confirmationCode.trim(),
    }),
  });

  return parseJsonResponse<AuthSessionResponseDto>(response, "Account confirmation failed");
}

export async function requestPasswordReset(credentials: PasswordResetRequestDto): Promise<PasswordResetResponseDto> {
  const response = await fetch(await createApiUrl("/api/v1/auth/password/forgot"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: credentials.email.trim().toLowerCase(),
    }),
  });

  return parseJsonResponse<PasswordResetResponseDto>(response, "Password reset request failed");
}

export async function confirmPasswordReset(credentials: PasswordResetConfirmRequestDto): Promise<PasswordResetConfirmResponseDto> {
  const response = await fetch(await createApiUrl("/api/v1/auth/password/reset"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: credentials.email.trim().toLowerCase(),
      confirmationCode: credentials.confirmationCode.trim(),
      password: credentials.password,
    }),
  });

  return parseJsonResponse<PasswordResetConfirmResponseDto>(response, "Password reset confirmation failed");
}

export async function getCurrentUser(accessToken: string): Promise<CurrentUserResponseDto> {
  const response = await fetch(await createApiUrl("/api/v1/auth/me"), {
    headers: authHeaders(accessToken),
  });

  return parseJsonResponse<{ user: AuthUserDto }>(response, "Current user lookup failed");
}
