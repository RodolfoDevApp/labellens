export function productNotFoundPk(): "OPS#PRODUCT_NOT_FOUND" {
  return "OPS#PRODUCT_NOT_FOUND";
}

export function productNotFoundSk(eventId: string): string {
  return `EVENT#${eventId}`;
}
