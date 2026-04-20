export type LabelLensEventType =
  | "food.searched.v1"
  | "product.scanned.v1"
  | "product.not_found.v1"
  | "menu.saved.v1"
  | "favorite.saved.v1";

export type LabelLensEvent<TPayload = unknown> = {
  eventId: string;
  eventType: LabelLensEventType;
  occurredAt: string;
  correlationId: string;
  payload: TPayload;
};

export interface EventPublisher {
  publish(event: LabelLensEvent): Promise<void>;
}
