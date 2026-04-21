import { RecordProductNotFoundCommand } from "@labellens/application";
import {
  createDynamoDbDocumentClient,
  createSqsClient,
  DynamoDbProductNotFoundRepository,
  SqsPollingConsumer,
} from "@labellens/infrastructure";
import { HandleProductNotFoundMessageCommand } from "../application/handle-product-not-found-message-command.js";
import { readProductNotFoundWorkerConfig } from "../config/product-not-found-worker-config.js";
import type { ProductNotFoundWorkerDependencies } from "./product-not-found-worker-dependencies.js";

export function createProductNotFoundWorkerDependencies(): ProductNotFoundWorkerDependencies {
  const config = readProductNotFoundWorkerConfig();
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
  const repository = new DynamoDbProductNotFoundRepository(dynamoDb, config.labelLensTableName);
  const command = new HandleProductNotFoundMessageCommand(new RecordProductNotFoundCommand(repository));

  return {
    consumer: new SqsPollingConsumer(
      sqs,
      {
        queueUrl: config.productNotFoundQueueUrl,
        maxMessages: config.maxMessages,
        waitTimeSeconds: config.waitTimeSeconds,
        visibilityTimeoutSeconds: config.visibilityTimeoutSeconds,
      },
      (message) => command.execute(message),
    ),
  };
}
