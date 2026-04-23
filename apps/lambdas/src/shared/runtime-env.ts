export type DynamoDbRuntimeConfig = {
  awsEndpointUrl?: string;
  awsRegion: string;
  labelLensTableName: string;
};

export function readDynamoDbRuntimeConfig(): DynamoDbRuntimeConfig {
  return {
    awsEndpointUrl: readOptionalEnv("AWS_ENDPOINT_URL"),
    awsRegion: readRequiredEnv("AWS_REGION"),
    labelLensTableName: readRequiredEnv("LABEL_LENS_TABLE"),
  };
}

export function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }

  return value;
}

export function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}
