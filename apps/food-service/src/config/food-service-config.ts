import "dotenv/config";
import { parseStorageDriver, type StorageDriver } from "./storage-driver.js";

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

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

export type FoodServiceConfig = {
  port: number;
  storageDriver: StorageDriver;
  awsEndpointUrl?: string;
  awsRegion: string;
  labelLensTableName: string;
  analyticsQueueUrl?: string;
  usdaApiKey: string;
  usdaApiBaseUrl: string;
};

export function readFoodServiceConfig(): FoodServiceConfig {
  const config: FoodServiceConfig = {
    port: readNumber("PORT", 4101),
    storageDriver: isTest ? "in-memory" : parseStorageDriver(process.env.STORAGE_DRIVER),
    awsRegion: process.env.AWS_REGION ?? "us-east-1",
    labelLensTableName: process.env.LABEL_LENS_TABLE ?? "LabelLensTable",
    usdaApiKey: isTest ? "" : (process.env.USDA_API_KEY ?? ""),
    usdaApiBaseUrl: process.env.USDA_API_BASE_URL ?? "https://api.nal.usda.gov/fdc/v1",
  };

  if (process.env.AWS_ENDPOINT_URL) {
    config.awsEndpointUrl = process.env.AWS_ENDPOINT_URL;
  }

  if (process.env.ANALYTICS_QUEUE_URL) {
    config.analyticsQueueUrl = process.env.ANALYTICS_QUEUE_URL;
  }

  return config;
}
