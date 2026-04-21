import {
  createDynamoDbDocumentClient,
  createSqsClient,
  DynamoDbEventIdempotencyRepository,
  SqsPollingConsumer,
} from "@labellens/infrastructure";
import { HandleFoodCacheRefreshMessageCommand } from "../application/handle-food-cache-refresh-message-command.js";
import { readFoodCacheRefreshWorkerConfig } from "../config/food-cache-refresh-worker-config.js";
import { HttpFoodCacheRefreshClient } from "../infrastructure/http/food-cache-refresh-client.js";
import { FoodCacheRefreshSqsMessageHandler } from "../infrastructure/sqs/food-cache-refresh-sqs-message-handler.js";
import type { FoodCacheRefreshWorkerDependencies } from "./food-cache-refresh-worker-dependencies.js";

export function createFoodCacheRefreshWorkerDependencies(): FoodCacheRefreshWorkerDependencies {
  const config = readFoodCacheRefreshWorkerConfig();
  const dynamoDb = createDynamoDbDocumentClient(
    config.awsEndpointUrl
      ? { endpoint: config.awsEndpointUrl, region: config.awsRegion, tableName: config.labelLensTableName }
      : { region: config.awsRegion, tableName: config.labelLensTableName },
  );
  const sqs = createSqsClient(
    config.awsEndpointUrl
      ? { endpoint: config.awsEndpointUrl, region: config.awsRegion }
      : { region: config.awsRegion },
  );
  const idempotencyRepository = new DynamoDbEventIdempotencyRepository(dynamoDb, config.labelLensTableName);
  const command = new HandleFoodCacheRefreshMessageCommand(
    new HttpFoodCacheRefreshClient(config.foodServiceUrl),
    idempotencyRepository,
  );
  const messageHandler = new FoodCacheRefreshSqsMessageHandler(command);

  return {
    consumer: new SqsPollingConsumer(
      sqs,
      {
        queueUrl: config.foodCacheRefreshQueueUrl,
        maxMessages: config.maxMessages,
        waitTimeSeconds: config.waitTimeSeconds,
        visibilityTimeoutSeconds: config.visibilityTimeoutSeconds,
      },
      (message) => messageHandler.handle(message),
    ),
  };
}
