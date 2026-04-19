"use client";

import { useEffect, useState } from "react";
import { demoLogin, type AuthModeDto, type AuthUserDto } from "@/shared/api/foods-api";

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

  async function login(credentials: AuthCredentials) {
    setIsLoggingIn(true);
    try {
      const result = await demoLogin({
        mode: credentials.mode,
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
        ...(credentials.displayName?.trim() ? { displayName: credentials.displayName.trim() } : {}),
      });
      const nextSession: AuthSession = {
        accessToken: result.accessToken,
        user: result.user,
      };

      writeStoredSession(nextSession);
      setSession(nextSession);
      return nextSession;
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
    login,
    logout,
  };
}
