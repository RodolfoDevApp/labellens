import type { AuthUser } from "@labellens/application";

const DEV_AUTH_PREFIX = "dev.";

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createDevAccessToken(user: AuthUser): string {
  return `${DEV_AUTH_PREFIX}${encodeBase64Url(JSON.stringify(user))}`;
}

export function parseBearerToken(authorizationHeader: string | undefined | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export function readDevAuthUser(authorizationHeader: string | undefined | null): AuthUser | null {
  const token = parseBearerToken(authorizationHeader);

  if (!token?.startsWith(DEV_AUTH_PREFIX)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(token.slice(DEV_AUTH_PREFIX.length))) as Partial<AuthUser>;

    if (typeof parsed.userId !== "string" || parsed.userId.length === 0) {
      return null;
    }

    return {
      userId: parsed.userId,
      displayName:
        typeof parsed.displayName === "string" && parsed.displayName.length > 0
          ? parsed.displayName
          : "Demo user",
    };
  } catch {
    return null;
  }
}
