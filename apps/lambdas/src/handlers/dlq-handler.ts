import { RecordDlqMessageCommand } from "@labellens/application";
import { DynamoDbDlqMessageRepository } from "@labellens/infrastructure";
import { HandleDlqMessageCommand } from "../../../dlq-handler/src/application/handle-dlq-message-command.js";
import { DlqSqsMessageHandler } from "../../../dlq-handler/src/infrastructure/sqs/dlq-sqs-message-handler.js";
import { createRuntimeDynamoDbDocumentClient, readLabelLensTableName } from "../shared/dynamodb-runtime.js";
import { processSqsBatch } from "../shared/sqs-batch-processor.js";
import { getQueueNameFromArn, toSqsMessage } from "../shared/sqs-message-adapter.js";
import type { SqsBatchResponse, SqsLambdaEvent } from "../shared/sqs-lambda-types.js";

const dynamoDb = createRuntimeDynamoDbDocumentClient();
const tableName = readLabelLensTableName();
const command = new HandleDlqMessageCommand(
  new RecordDlqMessageCommand(new DynamoDbDlqMessageRepository(dynamoDb, tableName)),
);

export async function handler(event: SqsLambdaEvent): Promise<SqsBatchResponse> {
  return processSqsBatch(event, async (record) => {
    const sourceQueueName = getQueueNameFromArn(record.eventSourceARN);
    await new DlqSqsMessageHandler(sourceQueueName, command).handle(toSqsMessage(record));
  });
}
