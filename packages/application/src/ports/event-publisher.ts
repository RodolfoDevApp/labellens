export type LabelLensEventType =
  | "food.searched.v1"
  | "product.scanned.v1"
  | "product.not_found.v1"
  | "menu.saved.v1"
  | "favorite.saved.v1"
  | "cache.refresh.food.requested.v1"
  | "cache.refresh.product.requested.v1";

export type LabelLensEventProducer =
  | "food-service"
  | "product-service"
  | "menu-service"
  | "favorites-service"
  | "eventbridge-scheduler";

export type LabelLensEvent<TPayload = unknown> = {
  eventId: string;
  eventType: LabelLensEventType;
  eventVersion: 1;
  occurredAt: string;
  correlationId: string;
  producer: LabelLensEventProducer;
  payload: TPayload;
};

export interface EventPublisher {
  publish(event: LabelLensEvent): Promise<void>;
}
