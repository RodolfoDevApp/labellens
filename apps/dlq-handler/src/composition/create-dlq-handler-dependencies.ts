import { RecordDlqMessageCommand } from "@labellens/application";
import {
  createDynamoDbDocumentClient,
  createSqsClient,
  DynamoDbDlqMessageRepository,
  SqsPollingConsumer,
} from "@labellens/infrastructure";
import { HandleDlqMessageCommand } from "../application/handle-dlq-message-command.js";
import { readDlqHandlerConfig } from "../config/dlq-handler-config.js";
import { DlqSqsMessageHandler } from "../infrastructure/sqs/dlq-sqs-message-handler.js";
import type { DlqHandlerDependencies } from "./dlq-handler-dependencies.js";

export function createDlqHandlerDependencies(): DlqHandlerDependencies {
  const config = readDlqHandlerConfig();
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
  const command = new HandleDlqMessageCommand(
    new RecordDlqMessageCommand(new DynamoDbDlqMessageRepository(dynamoDb, config.labelLensTableName)),
  );

  return {
    consumers: config.queues.map(({ sourceQueueName, queueUrl }) => {
      const messageHandler = new DlqSqsMessageHandler(sourceQueueName, command);

      return new SqsPollingConsumer(
        sqs,
        {
          queueUrl,
          maxMessages: config.maxMessages,
          waitTimeSeconds: config.waitTimeSeconds,
          visibilityTimeoutSeconds: config.visibilityTimeoutSeconds,
        },
        (message) => messageHandler.handle(message),
      );
    }),
  };
}
