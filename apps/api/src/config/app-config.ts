import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

config({
  path: path.resolve(currentDir, "../../.env.local"),
});

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

export const appConfig = {
  port: Number(process.env.PORT ?? 4000),
  usdaApiKey: isTest ? "" : (process.env.USDA_API_KEY ?? ""),
  usdaApiBaseUrl: process.env.USDA_API_BASE_URL ?? "https://api.nal.usda.gov/fdc/v1",
  openFoodFactsMode: isTest ? "fixture" : (process.env.OPEN_FOOD_FACTS_MODE ?? "fixture"),
  openFoodFactsUserAgent:
    process.env.OPEN_FOOD_FACTS_USER_AGENT ??
    "LabelLens/0.1 (https://localhost; contact: dev@labellens.local)",
};
