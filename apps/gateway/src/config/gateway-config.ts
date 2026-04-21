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

function readString(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw && raw.trim().length > 0 ? raw.trim() : fallback;
}

export type GatewayConfig = {
  port: number;
  apiInternalBaseUrl: string;
  allowedOrigins: string[];
};

export function readGatewayConfig(): GatewayConfig {
  const allowedOrigins = readString(
    "GATEWAY_ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001",
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    port: readNumber("PORT", 4000),
    apiInternalBaseUrl: readString("LABEL_LENS_API_INTERNAL_URL", "http://localhost:4100"),
    allowedOrigins,
  };
}
