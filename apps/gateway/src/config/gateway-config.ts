import "dotenv/config";
import type { GatewayServiceUrls } from "./gateway-service-urls.js";

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
  allowedOrigins: string[];
  serviceUrls: GatewayServiceUrls;
  storageDriver: string;
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
    allowedOrigins,
    storageDriver: readString("STORAGE_DRIVER", "in-memory"),
    serviceUrls: {
      auth: readString("LABEL_LENS_AUTH_SERVICE_URL", "http://localhost:4105"),
      favorites: readString("LABEL_LENS_FAVORITES_SERVICE_URL", "http://localhost:4104"),
      food: readString("LABEL_LENS_FOOD_SERVICE_URL", "http://localhost:4101"),
      menu: readString("LABEL_LENS_MENU_SERVICE_URL", "http://localhost:4103"),
      product: readString("LABEL_LENS_PRODUCT_SERVICE_URL", "http://localhost:4102"),
    },
  };
}
