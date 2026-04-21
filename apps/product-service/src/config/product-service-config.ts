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

function readOptionalUrl(name: string): string | undefined {
  const raw = process.env[name];

  if (!raw) {
    return undefined;
  }

  return raw;
}

export type ProductServiceConfig = {
  port: number;
  storageDriver: StorageDriver;
  awsEndpointUrl?: string;
  awsRegion: string;
  labelLensTableName: string;
  openFoodFactsMode: string;
  openFoodFactsUserAgent: string;
  productNotFoundQueueUrl?: string;
};

export function readProductServiceConfig(): ProductServiceConfig {
  const config: ProductServiceConfig = {
    port: readNumber("PORT", 4102),
    storageDriver: isTest ? "in-memory" : parseStorageDriver(process.env.STORAGE_DRIVER),
    awsRegion: process.env.AWS_REGION ?? "us-east-1",
    labelLensTableName: process.env.LABEL_LENS_TABLE ?? "LabelLensTable",
    openFoodFactsMode: isTest ? "fixture" : (process.env.OPEN_FOOD_FACTS_MODE ?? "fixture"),
    openFoodFactsUserAgent:
      process.env.OPEN_FOOD_FACTS_USER_AGENT ??
      "LabelLens/0.1 (https://localhost; contact: dev@labellens.local)",
  };

  const awsEndpointUrl = readOptionalUrl("AWS_ENDPOINT_URL");
  const productNotFoundQueueUrl = readOptionalUrl("PRODUCT_NOT_FOUND_QUEUE_URL");

  if (awsEndpointUrl) {
    config.awsEndpointUrl = awsEndpointUrl;
  }

  if (productNotFoundQueueUrl) {
    config.productNotFoundQueueUrl = productNotFoundQueueUrl;
  }

  return config;
}
