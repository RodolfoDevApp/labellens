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

export type AnalyticsWorkerConfig = {
  awsEndpointUrl?: string;
  awsRegion: string;
  labelLensTableName: string;
  analyticsQueueUrl: string;
  maxMessages: number;
  waitTimeSeconds: number;
  visibilityTimeoutSeconds: number;
  idleDelayMs: number;
};

export function readAnalyticsWorkerConfig(): AnalyticsWorkerConfig {
  const config: AnalyticsWorkerConfig = {
    awsRegion: process.env.AWS_REGION ?? "us-east-1",
    labelLensTableName: process.env.LABEL_LENS_TABLE ?? "LabelLensTable",
    analyticsQueueUrl: readRequired("ANALYTICS_QUEUE_URL"),
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
