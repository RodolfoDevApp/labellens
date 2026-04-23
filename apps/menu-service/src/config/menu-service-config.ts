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

export type MenuServiceConfig = {
  port: number;
  storageDriver: StorageDriver;
  awsEndpointUrl?: string;
  awsRegion: string;
  labelLensTableName: string;
  analyticsQueueUrl?: string;
  cognitoUserPoolId?: string;
  cognitoUserPoolClientId?: string;
};

export function readMenuServiceConfig(): MenuServiceConfig {
  const config: MenuServiceConfig = {
    port: readNumber("PORT", 4103),
    storageDriver: isTest ? "in-memory" : parseStorageDriver(process.env.STORAGE_DRIVER),
    awsRegion: process.env.AWS_REGION ?? "us-east-1",
    labelLensTableName: process.env.LABEL_LENS_TABLE ?? "LabelLensTable",
  };

  if (process.env.AWS_ENDPOINT_URL) {
    config.awsEndpointUrl = process.env.AWS_ENDPOINT_URL;
  }

  if (process.env.ANALYTICS_QUEUE_URL) {
    config.analyticsQueueUrl = process.env.ANALYTICS_QUEUE_URL;
  }

  if (process.env.COGNITO_USER_POOL_ID) {
    config.cognitoUserPoolId = process.env.COGNITO_USER_POOL_ID;
  }

  if (process.env.COGNITO_USER_POOL_CLIENT_ID) {
    config.cognitoUserPoolClientId = process.env.COGNITO_USER_POOL_CLIENT_ID;
  }

  return config;
}
