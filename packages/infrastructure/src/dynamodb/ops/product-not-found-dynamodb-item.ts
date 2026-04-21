export type ProductNotFoundEventDynamoDbItem = {
  PK: "OPS#PRODUCT_NOT_FOUND#";
  SK: string;
  entityType: "ProductNotFoundEvent";
  eventId: string;
  barcode: string;
  source: "OPEN_FOOD_FACTS";
  sourceMode: "fixture" | "live";
  reason: "OFF_NOT_FOUND";
  requestPath: "/api/v1/products/barcode/{barcode}";
  correlationId: string;
  occurredAt: string;
  recordedAt: string;
};

export type ProductNotFoundDailyAggregateDynamoDbItem = {
  PK: "OPS#PRODUCT_NOT_FOUND#";
  SK: string;
  entityType: "ProductNotFoundDailyAggregate";
  count: number;
  lastBarcode: string;
  lastSeenAt: string;
  lastCorrelationId: string;
  updatedAt: string;
};

export type ProductNotFoundDynamoDbItem =
  | ProductNotFoundEventDynamoDbItem
  | ProductNotFoundDailyAggregateDynamoDbItem;
