import {
  createDynamoDbDocumentClient,
  createSqsClient,
  DynamoDbEventIdempotencyRepository,
  SqsPollingConsumer,
} from "@labellens/infrastructure";
import { HandleProductCacheRefreshMessageCommand } from "../application/handle-product-cache-refresh-message-command.js";
import { readProductCacheRefreshWorkerConfig } from "../config/product-cache-refresh-worker-config.js";
import { HttpProductCacheRefreshClient } from "../infrastructure/http/product-cache-refresh-client.js";
import { ProductCacheRefreshSqsMessageHandler } from "../infrastructure/sqs/product-cache-refresh-sqs-message-handler.js";
import type { ProductCacheRefreshWorkerDependencies } from "./product-cache-refresh-worker-dependencies.js";

export function createProductCacheRefreshWorkerDependencies(): ProductCacheRefreshWorkerDependencies {
  const config = readProductCacheRefreshWorkerConfig();
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
  const command = new HandleProductCacheRefreshMessageCommand(
    new HttpProductCacheRefreshClient(config.productServiceUrl),
    idempotencyRepository,
  );
  const messageHandler = new ProductCacheRefreshSqsMessageHandler(command);

  return {
    consumer: new SqsPollingConsumer(
      sqs,
      {
        queueUrl: config.productCacheRefreshQueueUrl,
        maxMessages: config.maxMessages,
        waitTimeSeconds: config.waitTimeSeconds,
        visibilityTimeoutSeconds: config.visibilityTimeoutSeconds,
      },
      (message) => messageHandler.handle(message),
    ),
  };
}
