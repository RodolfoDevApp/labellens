export type DlqMessageDynamoDbItem = {
  PK: "OPS#DLQ#";
  SK: string;
  entityType: "DlqMessage";
  id: string;
  sourceQueueName: string;
  messageId: string | null;
  eventId: string | null;
  eventType: string | null;
  correlationId: string | null;
  producer: string | null;
  payload: unknown;
  rawBody: string | null;
  errorSummary: string | null;
  receivedAt: string;
};
