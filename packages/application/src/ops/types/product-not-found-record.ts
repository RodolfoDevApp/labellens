export type ProductNotFoundRecord = {
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
