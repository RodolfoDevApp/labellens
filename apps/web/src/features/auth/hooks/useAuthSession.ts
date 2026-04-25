"use client";

import { useEffect, useState } from "react";
import {
  confirmPasswordReset as confirmPasswordResetRequest,
  confirmSession as confirmSessionRequest,
  createSession,
  requestPasswordReset as requestPasswordResetRequest,
  type AuthConfirmationRequestDto,
  type AuthModeDto,
  type AuthSessionResponseDto,
  type AuthUserDto,
  type PasswordResetConfirmRequestDto,
  type PasswordResetConfirmResponseDto,
  type PasswordResetRequestDto,
  type PasswordResetResponseDto,
} from "@/shared/api/foods-api";

export type AuthSession = {
  accessToken: string;
  user: AuthUserDto;
};

export type AuthCredentials = {
  mode: AuthModeDto;
  email: string;
  password: string;
  displayName?: string;
};

export type AuthConfirmation = {
  email: string;
  password: string;
  confirmationCode: string;
};

export type PasswordResetRequest = PasswordResetRequestDto;
export type PasswordResetRequestResult = PasswordResetResponseDto;
export type PasswordResetConfirmation = PasswordResetConfirmRequestDto;
export type PasswordResetConfirmationResult = PasswordResetConfirmResponseDto;

export type PendingConfirmation = {
  nextStep: "confirm";
  email: string;
  password: string;
  message: string;
  deliveryDestination?: string;
  deliveryMedium?: string;
};

const AUTH_STORAGE_KEY = "labellens.auth.v1";
const AUTH_EVENT_NAME = "labellens:auth-updated";

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AuthSession>;
  return (
    typeof candidate.accessToken === "string" &&
    candidate.accessToken.length > 0 &&
    !!candidate.user &&
    typeof candidate.user === "object" &&
    typeof candidate.user.userId === "string" &&
    typeof candidate.user.displayName === "string"
  );
}

function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) ?? "null") as unknown;
    return isAuthSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: AuthSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (session) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME));
}

function isPendingConfirmation(result: AuthSessionResponseDto): result is Omit<PendingConfirmation, "password"> {
  return "nextStep" in result && result.nextStep === "confirm";
}

function toAuthSession(result: AuthSessionResponseDto): AuthSession {
  if (!("accessToken" in result) || !("user" in result)) {
    throw new Error("Authentication response did not include an access token.");
  }

  return {
    accessToken: result.accessToken,
    user: result.user,
  };
}

export function getStoredAuthSession(): AuthSession | null {
  return readStoredSession();
}

export function useAuthSession() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hasHydratedAuth, setHasHydratedAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    setSession(readStoredSession());
    setHasHydratedAuth(true);

    function syncSession() {
      setSession(readStoredSession());
    }

    window.addEventListener("storage", syncSession);
    window.addEventListener(AUTH_EVENT_NAME, syncSession);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener(AUTH_EVENT_NAME, syncSession);
    };
  }, []);

  async function startSession(credentials: AuthCredentials): Promise<AuthSession | PendingConfirmation> {
    setIsLoggingIn(true);
    try {
      const result = await createSession({
        mode: credentials.mode,
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
        ...(credentials.displayName?.trim() ? { displayName: credentials.displayName.trim() } : {}),
      });

      if (isPendingConfirmation(result)) {
        return {
          nextStep: "confirm",
          email: credentials.email.trim().toLowerCase(),
          password: credentials.password,
          message: result.message,
          deliveryDestination: result.deliveryDestination,
          deliveryMedium: result.deliveryMedium,
        };
      }

      const nextSession = toAuthSession(result);
      writeStoredSession(nextSession);
      setSession(nextSession);
      return nextSession;
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function confirmSession(confirmation: AuthConfirmation): Promise<AuthSession> {
    setIsLoggingIn(true);
    try {
      const result = await confirmSessionRequest({
        email: confirmation.email,
        password: confirmation.password,
        confirmationCode: confirmation.confirmationCode,
      } satisfies AuthConfirmationRequestDto);
      const nextSession = toAuthSession(result);
      writeStoredSession(nextSession);
      setSession(nextSession);
      return nextSession;
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function requestPasswordReset(request: PasswordResetRequest): Promise<PasswordResetRequestResult> {
    setIsLoggingIn(true);
    try {
      return await requestPasswordResetRequest({
        email: request.email.trim().toLowerCase(),
      });
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function confirmPasswordReset(request: PasswordResetConfirmation): Promise<PasswordResetConfirmationResult> {
    setIsLoggingIn(true);
    try {
      return await confirmPasswordResetRequest({
        email: request.email.trim().toLowerCase(),
        confirmationCode: request.confirmationCode,
        password: request.password,
      });
    } finally {
      setIsLoggingIn(false);
    }
  }

  function logout() {
    writeStoredSession(null);
    setSession(null);
  }

  return {
    session,
    user: session?.user ?? null,
    accessToken: session?.accessToken ?? null,
    hasHydratedAuth,
    isAuthenticated: !!session,
    isLoggingIn,
    startSession,
    confirmSession,
    requestPasswordReset,
    confirmPasswordReset,
    logout,
  };
}
