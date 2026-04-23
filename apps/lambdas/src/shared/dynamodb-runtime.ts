import { createDynamoDbDocumentClient } from "@labellens/infrastructure";
import { readDynamoDbRuntimeConfig } from "./runtime-env.js";

export function createRuntimeDynamoDbDocumentClient() {
  const config = readDynamoDbRuntimeConfig();

  return createDynamoDbDocumentClient(
    config.awsEndpointUrl
      ? { endpoint: config.awsEndpointUrl, region: config.awsRegion, tableName: config.labelLensTableName }
      : { region: config.awsRegion, tableName: config.labelLensTableName },
  );
}

export function readLabelLensTableName(): string {
  return readDynamoDbRuntimeConfig().labelLensTableName;
}
