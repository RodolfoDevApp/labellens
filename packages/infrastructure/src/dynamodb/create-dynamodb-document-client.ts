import { DynamoDBClient, type DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { DynamoDbConnectionConfig } from "./dynamodb-connection-config.js";

export function createDynamoDbDocumentClient(
  config: DynamoDbConnectionConfig,
): DynamoDBDocumentClient {
  const clientConfig: DynamoDBClientConfig = {
    region: config.region,
  };

  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
  }

  const client = new DynamoDBClient(clientConfig);

  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });
}
