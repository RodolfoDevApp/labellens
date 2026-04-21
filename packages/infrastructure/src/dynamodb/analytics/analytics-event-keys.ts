export function analyticsEventPk(): "OPS#ANALYTICS" {
  return "OPS#ANALYTICS";
}

export function analyticsEventSk(eventId: string): string {
  return `EVENT#${eventId}`;
}
