import {
  createDynamoDbDocumentClient,
  type DynamoDbConnectionConfig,
} from "@labellens/infrastructure";
import { appConfig } from "../../config/app-config.js";

function createConnectionConfig(): DynamoDbConnectionConfig {
  const connectionConfig: DynamoDbConnectionConfig = {
    region: appConfig.awsRegion,
    tableName: appConfig.labelLensTableName,
  };

  if (appConfig.awsEndpointUrl) {
    connectionConfig.endpoint = appConfig.awsEndpointUrl;
  }

  return connectionConfig;
}

export function createApiDynamoDbDocumentClient() {
  return createDynamoDbDocumentClient(createConnectionConfig());
}
