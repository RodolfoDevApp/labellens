export function eventIdempotencyPk(eventId: string): string {
  return `EVENT#${eventId}`;
}

export function eventIdempotencySk(): "PROCESSED" {
  return "PROCESSED";
}
