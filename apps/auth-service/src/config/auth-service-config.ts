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
};

export function readAuthServiceConfig(): AuthServiceConfig {
  return {
    port: readNumber("PORT", 4105),
  };
}
