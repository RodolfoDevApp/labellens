import "dotenv/config";

function readRequired(name: string): string {
  const raw = process.env[name];

  if (!raw) {
    throw new Error(`${name} is required.`);
  }

  return raw;
}

function readOptional(name: string): string | undefined {
  const raw = process.env[name];

  if (!raw) {
    return undefined;
  }

  return raw;
}

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

export type FoodCacheRefreshWorkerConfig = {
  awsEndpointUrl?: string;
  awsRegion: string;
  labelLensTableName: string;
  foodCacheRefreshQueueUrl: string;
  foodServiceUrl: string;
  maxMessages: number;
  waitTimeSeconds: number;
  visibilityTimeoutSeconds: number;
  idleDelayMs: number;
};

export function readFoodCacheRefreshWorkerConfig(): FoodCacheRefreshWorkerConfig {
  const config: FoodCacheRefreshWorkerConfig = {
    awsRegion: process.env.AWS_REGION ?? "us-east-1",
    labelLensTableName: process.env.LABEL_LENS_TABLE ?? "LabelLensTable",
    foodCacheRefreshQueueUrl: readRequired("FOOD_CACHE_REFRESH_QUEUE_URL"),
    foodServiceUrl: process.env.LABEL_LENS_FOOD_SERVICE_URL ?? "http://food-service:4101",
    maxMessages: readNumber("WORKER_MAX_MESSAGES", 5),
    waitTimeSeconds: readNumber("WORKER_WAIT_TIME_SECONDS", 5),
    visibilityTimeoutSeconds: readNumber("WORKER_VISIBILITY_TIMEOUT_SECONDS", 30),
    idleDelayMs: readNumber("WORKER_IDLE_DELAY_MS", 250),
  };

  const awsEndpointUrl = readOptional("AWS_ENDPOINT_URL");

  if (awsEndpointUrl) {
    config.awsEndpointUrl = awsEndpointUrl;
  }

  return config;
}
