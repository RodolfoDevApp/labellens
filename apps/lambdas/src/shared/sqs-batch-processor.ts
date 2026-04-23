import type { SqsBatchResponse, SqsLambdaEvent, SqsLambdaRecord } from "./sqs-lambda-types.js";

export type SqsRecordHandler = (record: SqsLambdaRecord) => Promise<void>;

export async function processSqsBatch(event: SqsLambdaEvent, handler: SqsRecordHandler): Promise<SqsBatchResponse> {
  const failures: SqsBatchResponse["batchItemFailures"] = [];

  for (const record of event.Records ?? []) {
    try {
      await handler(record);
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "lambda.sqs_record_failed",
          messageId: record.messageId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
}
