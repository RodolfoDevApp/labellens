import type { AuthSessionVerifier, AuthUser } from "@labellens/application";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { parseBearerToken } from "./dev-auth-token.js";

export type CognitoJwtAuthSessionVerifierOptions = {
  userPoolId: string;
  clientId: string;
};

export class CognitoJwtAuthSessionVerifier implements AuthSessionVerifier {
  private readonly verifier;

  constructor(options: CognitoJwtAuthSessionVerifierOptions) {
    this.verifier = CognitoJwtVerifier.create({
      userPoolId: options.userPoolId,
      clientId: options.clientId,
      tokenUse: "access",
    });
  }

  async verify(authorizationHeader: string | undefined | null): Promise<AuthUser | null> {
    const token = parseBearerToken(authorizationHeader);

    if (!token) {
      return null;
    }

    try {
      const payload = await this.verifier.verify(token);
      const payloadRecord = payload as Record<string, unknown>;

      const userId = getStringClaim(payloadRecord, "sub");

      if (!userId) {
        return null;
      }

      const displayName = normalizeDisplayName(
        getStringClaim(payloadRecord, "name"),
        getStringClaim(payloadRecord, "email"),
        getStringClaim(payloadRecord, "preferred_username"),
        getStringClaim(payloadRecord, "username"),
        getStringClaim(payloadRecord, "cognito:username"),
      );

      return {
        userId,
        displayName,
      };
    } catch {
      return null;
    }
  }
}

function getStringClaim(payload: Record<string, unknown>, claimName: string): string | undefined {
  const value = payload[claimName];

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeDisplayName(...values: Array<string | undefined>): string {
  for (const value of values) {
    const displayName = normalizeDisplayNameCandidate(value);

    if (displayName) {
      return displayName;
    }
  }

  return "Authenticated user";
}

function normalizeDisplayNameCandidate(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed || /^labellens-[a-f0-9]{40}$/i.test(trimmed)) {
    return undefined;
  }

  if (trimmed.includes("@")) {
    return trimmed.split("@")[0] || undefined;
  }

  return trimmed;
}
