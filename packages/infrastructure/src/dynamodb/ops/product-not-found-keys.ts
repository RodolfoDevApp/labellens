export function productNotFoundPk(): "OPS#PRODUCT_NOT_FOUND#" {
  return "OPS#PRODUCT_NOT_FOUND#";
}

export function productNotFoundEventSk(eventId: string): string {
  return `EVENT#${eventId}`;
}

export function productNotFoundDailyAggregateSk(date: string): string {
  return `DATE#${date}`;
}
