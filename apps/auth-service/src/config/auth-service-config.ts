import "dotenv/config";

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }

  return parsed;
}

export type AuthServiceConfig = {
  port: number;
  allowDemoLogin: boolean;
  cognitoUserPoolId?: string;
  cognitoUserPoolClientId?: string;
};

export function readAuthServiceConfig(): AuthServiceConfig {
  const cognitoUserPoolId = normalizeOptionalString(process.env.COGNITO_USER_POOL_ID);
  const cognitoUserPoolClientId = normalizeOptionalString(process.env.COGNITO_USER_POOL_CLIENT_ID);

  return {
    port: readNumber("PORT", 4105),
    allowDemoLogin: !(cognitoUserPoolId && cognitoUserPoolClientId),
    ...(cognitoUserPoolId ? { cognitoUserPoolId } : {}),
    ...(cognitoUserPoolClientId ? { cognitoUserPoolClientId } : {}),
  };
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
