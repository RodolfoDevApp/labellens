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

function readQueueUrls(): Array<{ sourceQueueName: string; queueUrl: string }> {
  return [
    { sourceQueueName: "product-not-found", queueUrl: readRequired("PRODUCT_NOT_FOUND_DLQ_URL") },
    { sourceQueueName: "analytics", queueUrl: readRequired("ANALYTICS_DLQ_URL") },
    { sourceQueueName: "food-cache-refresh", queueUrl: readRequired("FOOD_CACHE_REFRESH_DLQ_URL") },
    { sourceQueueName: "product-cache-refresh", queueUrl: readRequired("PRODUCT_CACHE_REFRESH_DLQ_URL") },
  ];
}

export type DlqHandlerConfig = {
  awsEndpointUrl?: string;
  awsRegion: string;
  labelLensTableName: string;
  queues: Array<{ sourceQueueName: string; queueUrl: string }>;
  maxMessages: number;
  waitTimeSeconds: number;
  visibilityTimeoutSeconds: number;
  idleDelayMs: number;
};

export function readDlqHandlerConfig(): DlqHandlerConfig {
  const config: DlqHandlerConfig = {
    awsRegion: process.env.AWS_REGION ?? "us-east-1",
    labelLensTableName: process.env.LABEL_LENS_TABLE ?? "LabelLensTable",
    queues: readQueueUrls(),
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
