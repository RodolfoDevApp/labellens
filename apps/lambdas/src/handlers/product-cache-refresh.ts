import { DynamoDbEventIdempotencyRepository } from "@labellens/infrastructure";
import { HandleProductCacheRefreshMessageCommand } from "../../../product-cache-refresh-worker/src/application/handle-product-cache-refresh-message-command.js";
import { HttpProductCacheRefreshClient } from "../../../product-cache-refresh-worker/src/infrastructure/http/product-cache-refresh-client.js";
import { ProductCacheRefreshSqsMessageHandler } from "../../../product-cache-refresh-worker/src/infrastructure/sqs/product-cache-refresh-sqs-message-handler.js";
import { createRuntimeDynamoDbDocumentClient, readLabelLensTableName } from "../shared/dynamodb-runtime.js";
import { readRequiredEnv } from "../shared/runtime-env.js";
import { processSqsBatch } from "../shared/sqs-batch-processor.js";
import { toSqsMessage } from "../shared/sqs-message-adapter.js";
import type { SqsBatchResponse, SqsLambdaEvent } from "../shared/sqs-lambda-types.js";

const dynamoDb = createRuntimeDynamoDbDocumentClient();
const tableName = readLabelLensTableName();
const messageHandler = new ProductCacheRefreshSqsMessageHandler(
  new HandleProductCacheRefreshMessageCommand(
    new HttpProductCacheRefreshClient(readRequiredEnv("LABEL_LENS_PRODUCT_SERVICE_URL")),
    new DynamoDbEventIdempotencyRepository(dynamoDb, tableName),
  ),
);

export async function handler(event: SqsLambdaEvent): Promise<SqsBatchResponse> {
  return processSqsBatch(event, (record) => messageHandler.handle(toSqsMessage(record)));
}
