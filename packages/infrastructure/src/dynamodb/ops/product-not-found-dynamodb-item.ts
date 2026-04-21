export type ProductNotFoundDynamoDbItem = {
  PK: "OPS#PRODUCT_NOT_FOUND";
  SK: string;
  eventId: string;
  barcode: string;
  source: "OPEN_FOOD_FACTS";
  correlationId: string;
  occurredAt: string;
  recordedAt: string;
};
