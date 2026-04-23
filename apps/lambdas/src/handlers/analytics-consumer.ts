import { RecordAnalyticsEventCommand } from "@labellens/application";
import { DynamoDbAnalyticsEventRepository, DynamoDbEventIdempotencyRepository } from "@labellens/infrastructure";
import { HandleAnalyticsEventCommand } from "../../../analytics-worker/src/application/handle-analytics-event-command.js";
import { AnalyticsSqsMessageHandler } from "../../../analytics-worker/src/infrastructure/sqs/analytics-sqs-message-handler.js";
import { createRuntimeDynamoDbDocumentClient, readLabelLensTableName } from "../shared/dynamodb-runtime.js";
import { processSqsBatch } from "../shared/sqs-batch-processor.js";
import { toSqsMessage } from "../shared/sqs-message-adapter.js";
import type { SqsBatchResponse, SqsLambdaEvent } from "../shared/sqs-lambda-types.js";

const dynamoDb = createRuntimeDynamoDbDocumentClient();
const tableName = readLabelLensTableName();
const messageHandler = new AnalyticsSqsMessageHandler(
  new HandleAnalyticsEventCommand(
    new RecordAnalyticsEventCommand(new DynamoDbAnalyticsEventRepository(dynamoDb, tableName)),
    new DynamoDbEventIdempotencyRepository(dynamoDb, tableName),
  ),
);

export async function handler(event: SqsLambdaEvent): Promise<SqsBatchResponse> {
  return processSqsBatch(event, (record) => messageHandler.handle(toSqsMessage(record)));
}
