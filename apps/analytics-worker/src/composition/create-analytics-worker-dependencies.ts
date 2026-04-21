import { RecordAnalyticsEventCommand } from "@labellens/application";
import {
  createDynamoDbDocumentClient,
  createSqsClient,
  DynamoDbAnalyticsEventRepository,
  DynamoDbEventIdempotencyRepository,
  SqsPollingConsumer,
} from "@labellens/infrastructure";
import { HandleAnalyticsEventCommand } from "../application/handle-analytics-event-command.js";
import { readAnalyticsWorkerConfig } from "../config/analytics-worker-config.js";
import { AnalyticsSqsMessageHandler } from "../infrastructure/sqs/analytics-sqs-message-handler.js";
import type { AnalyticsWorkerDependencies } from "./analytics-worker-dependencies.js";

export function createAnalyticsWorkerDependencies(): AnalyticsWorkerDependencies {
  const config = readAnalyticsWorkerConfig();
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
  const repository = new DynamoDbAnalyticsEventRepository(dynamoDb, config.labelLensTableName);
  const idempotencyRepository = new DynamoDbEventIdempotencyRepository(dynamoDb, config.labelLensTableName);
  const command = new HandleAnalyticsEventCommand(
    new RecordAnalyticsEventCommand(repository),
    idempotencyRepository,
  );
  const messageHandler = new AnalyticsSqsMessageHandler(command);

  return {
    consumer: new SqsPollingConsumer(
      sqs,
      {
        queueUrl: config.analyticsQueueUrl,
        maxMessages: config.maxMessages,
        waitTimeSeconds: config.waitTimeSeconds,
        visibilityTimeoutSeconds: config.visibilityTimeoutSeconds,
      },
      (message) => messageHandler.handle(message),
    ),
  };
}
