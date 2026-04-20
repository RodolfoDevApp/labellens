import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseStorageDriver } from "./storage-driver.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

config({
  path: path.resolve(currentDir, "../../.env.local"),
});

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

export const appConfig = {
  port: Number(process.env.PORT ?? 4000),
  storageDriver: isTest ? "in-memory" : parseStorageDriver(process.env.STORAGE_DRIVER),
  awsEndpointUrl: process.env.AWS_ENDPOINT_URL,
  awsRegion: process.env.AWS_REGION ?? "us-east-1",
  labelLensTableName: process.env.LABEL_LENS_TABLE ?? "LabelLensTable",
  usdaApiKey: isTest ? "" : (process.env.USDA_API_KEY ?? ""),
  usdaApiBaseUrl: process.env.USDA_API_BASE_URL ?? "https://api.nal.usda.gov/fdc/v1",
  openFoodFactsMode: isTest ? "fixture" : (process.env.OPEN_FOOD_FACTS_MODE ?? "fixture"),
  openFoodFactsUserAgent:
    process.env.OPEN_FOOD_FACTS_USER_AGENT ??
    "LabelLens/0.1 (https://localhost; contact: dev@labellens.local)",
};
