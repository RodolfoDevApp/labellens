export type ProductNotFoundRecord = {
  eventId: string;
  barcode: string;
  source: "OPEN_FOOD_FACTS";
  correlationId: string;
  occurredAt: string;
  recordedAt: string;
};
