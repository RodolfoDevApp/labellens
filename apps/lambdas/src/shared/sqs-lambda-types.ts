export type SqsLambdaEvent = {
  Records?: SqsLambdaRecord[];
};

export type SqsLambdaRecord = {
  messageId: string;
  receiptHandle?: string;
  body?: string;
  attributes?: Record<string, string>;
  messageAttributes?: Record<string, unknown>;
  eventSourceARN?: string;
};

export type SqsBatchResponse = {
  batchItemFailures: Array<{
    itemIdentifier: string;
  }>;
};
