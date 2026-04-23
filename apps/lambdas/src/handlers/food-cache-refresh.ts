import { DynamoDbEventIdempotencyRepository } from "@labellens/infrastructure";
import { HandleFoodCacheRefreshMessageCommand } from "../../../food-cache-refresh-worker/src/application/handle-food-cache-refresh-message-command.js";
import { HttpFoodCacheRefreshClient } from "../../../food-cache-refresh-worker/src/infrastructure/http/food-cache-refresh-client.js";
import { FoodCacheRefreshSqsMessageHandler } from "../../../food-cache-refresh-worker/src/infrastructure/sqs/food-cache-refresh-sqs-message-handler.js";
import { createRuntimeDynamoDbDocumentClient, readLabelLensTableName } from "../shared/dynamodb-runtime.js";
import { readRequiredEnv } from "../shared/runtime-env.js";
import { processSqsBatch } from "../shared/sqs-batch-processor.js";
import { toSqsMessage } from "../shared/sqs-message-adapter.js";
import type { SqsBatchResponse, SqsLambdaEvent } from "../shared/sqs-lambda-types.js";

const dynamoDb = createRuntimeDynamoDbDocumentClient();
const tableName = readLabelLensTableName();
const messageHandler = new FoodCacheRefreshSqsMessageHandler(
  new HandleFoodCacheRefreshMessageCommand(
    new HttpFoodCacheRefreshClient(readRequiredEnv("LABEL_LENS_FOOD_SERVICE_URL")),
    new DynamoDbEventIdempotencyRepository(dynamoDb, tableName),
  ),
);

export async function handler(event: SqsLambdaEvent): Promise<SqsBatchResponse> {
  return processSqsBatch(event, (record) => messageHandler.handle(toSqsMessage(record)));
}
