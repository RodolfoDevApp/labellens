import { randomUUID } from "node:crypto";
import type { LabelLensEvent } from "../ports/event-publisher.js";

export type FoodCacheRefreshRequestedPayload = {
  target: "food";
  scheduledFor: string;
  limit: number;
};

export type ProductCacheRefreshRequestedPayload = {
  target: "product";
  scheduledFor: string;
  limit: number;
};

export type FoodCacheRefreshRequestedEvent = LabelLensEvent<FoodCacheRefreshRequestedPayload> & {
  eventType: "cache.refresh.food.requested.v1";
  producer: "eventbridge-scheduler";
};

export type ProductCacheRefreshRequestedEvent = LabelLensEvent<ProductCacheRefreshRequestedPayload> & {
  eventType: "cache.refresh.product.requested.v1";
  producer: "eventbridge-scheduler";
};

function newSchedulerEventBase(input: { correlationId: string; now?: Date; eventId?: string }) {
  return {
    eventId: input.eventId ?? randomUUID(),
    eventVersion: 1 as const,
    occurredAt: (input.now ?? new Date()).toISOString(),
    correlationId: input.correlationId,
    producer: "eventbridge-scheduler" as const,
  };
}

export function createCacheRefreshFoodRequestedEvent(input: {
  scheduledFor: string;
  limit: number;
  correlationId: string;
  now?: Date;
  eventId?: string;
}): FoodCacheRefreshRequestedEvent {
  return {
    ...newSchedulerEventBase(input),
    eventType: "cache.refresh.food.requested.v1",
    payload: {
      target: "food",
      scheduledFor: input.scheduledFor,
      limit: input.limit,
    },
  };
}

export function createCacheRefreshProductRequestedEvent(input: {
  scheduledFor: string;
  limit: number;
  correlationId: string;
  now?: Date;
  eventId?: string;
}): ProductCacheRefreshRequestedEvent {
  return {
    ...newSchedulerEventBase(input),
    eventType: "cache.refresh.product.requested.v1",
    payload: {
      target: "product",
      scheduledFor: input.scheduledFor,
      limit: input.limit,
    },
  };
}
