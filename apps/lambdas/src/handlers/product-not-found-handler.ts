import { RecordProductNotFoundCommand } from "@labellens/application";
import { DynamoDbEventIdempotencyRepository, DynamoDbProductNotFoundRepository } from "@labellens/infrastructure";
import { HandleProductNotFoundMessageCommand } from "../../../product-not-found-worker/src/application/handle-product-not-found-message-command.js";
import { ProductNotFoundSqsMessageHandler } from "../../../product-not-found-worker/src/infrastructure/sqs/product-not-found-sqs-message-handler.js";
import { createRuntimeDynamoDbDocumentClient, readLabelLensTableName } from "../shared/dynamodb-runtime.js";
import { processSqsBatch } from "../shared/sqs-batch-processor.js";
import { toSqsMessage } from "../shared/sqs-message-adapter.js";
import type { SqsBatchResponse, SqsLambdaEvent } from "../shared/sqs-lambda-types.js";

const dynamoDb = createRuntimeDynamoDbDocumentClient();
const tableName = readLabelLensTableName();
const messageHandler = new ProductNotFoundSqsMessageHandler(
  new HandleProductNotFoundMessageCommand(
    new RecordProductNotFoundCommand(new DynamoDbProductNotFoundRepository(dynamoDb, tableName)),
    new DynamoDbEventIdempotencyRepository(dynamoDb, tableName),
  ),
);

export async function handler(event: SqsLambdaEvent): Promise<SqsBatchResponse> {
  return processSqsBatch(event, (record) => messageHandler.handle(toSqsMessage(record)));
}
