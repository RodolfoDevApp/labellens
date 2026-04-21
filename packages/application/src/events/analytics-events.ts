import { createHash, randomUUID } from "node:crypto";
import type { FavoriteItem } from "../ports/favorite-repository.js";
import type { LabelLensEvent } from "../ports/event-publisher.js";
import type { SavedMenu } from "../ports/saved-menu-repository.js";

export type AnalyticsEventType =
  | "food.searched.v1"
  | "product.scanned.v1"
  | "menu.saved.v1"
  | "favorite.saved.v1";

export type FoodSearchedEventPayload = {
  query: string;
  queryUsed: string;
  resultCount: number;
  sourceMode: "fixture" | "live";
};

export type ProductScannedEventPayload = {
  barcode: string;
  sourceMode: "fixture" | "live";
  productName: string | null;
};

export type MenuSavedEventPayload = {
  ownerIdHash: string;
  menuId: string;
  mealCount: number;
  itemCount: number;
};

export type FavoriteSavedEventPayload = {
  ownerIdHash: string;
  favoriteId: string;
  source: string;
  sourceId: string;
};

export type FoodSearchedEvent = LabelLensEvent<FoodSearchedEventPayload> & {
  eventType: "food.searched.v1";
  producer: "food-service";
};

export type ProductScannedEvent = LabelLensEvent<ProductScannedEventPayload> & {
  eventType: "product.scanned.v1";
  producer: "product-service";
};

export type MenuSavedEvent = LabelLensEvent<MenuSavedEventPayload> & {
  eventType: "menu.saved.v1";
  producer: "menu-service";
};

export type FavoriteSavedEvent = LabelLensEvent<FavoriteSavedEventPayload> & {
  eventType: "favorite.saved.v1";
  producer: "favorites-service";
};

export type AnalyticsEvent =
  | FoodSearchedEvent
  | ProductScannedEvent
  | MenuSavedEvent
  | FavoriteSavedEvent;

function ownerIdHash(ownerId: string): string {
  return createHash("sha256").update(ownerId).digest("hex");
}

function newEventBase(input: { correlationId: string; now?: Date; eventId?: string }) {
  return {
    eventId: input.eventId ?? randomUUID(),
    eventVersion: 1 as const,
    occurredAt: (input.now ?? new Date()).toISOString(),
    correlationId: input.correlationId,
  };
}

export function createFoodSearchedEvent(input: {
  query: string;
  queryUsed: string;
  resultCount: number;
  sourceMode: "fixture" | "live";
  correlationId: string;
  now?: Date;
  eventId?: string;
}): FoodSearchedEvent {
  return {
    ...newEventBase(input),
    eventType: "food.searched.v1",
    producer: "food-service",
    payload: {
      query: input.query,
      queryUsed: input.queryUsed,
      resultCount: input.resultCount,
      sourceMode: input.sourceMode,
    },
  };
}

export function createProductScannedEvent(input: {
  barcode: string;
  sourceMode: "fixture" | "live";
  productName: string | null;
  correlationId: string;
  now?: Date;
  eventId?: string;
}): ProductScannedEvent {
  return {
    ...newEventBase(input),
    eventType: "product.scanned.v1",
    producer: "product-service",
    payload: {
      barcode: input.barcode,
      sourceMode: input.sourceMode,
      productName: input.productName,
    },
  };
}

export function createMenuSavedEvent(input: {
  menu: SavedMenu;
  correlationId: string;
  now?: Date;
  eventId?: string;
}): MenuSavedEvent {
  const itemCount = input.menu.meals.reduce((total, meal) => total + meal.items.length, 0);

  return {
    ...newEventBase(input),
    eventType: "menu.saved.v1",
    producer: "menu-service",
    payload: {
      ownerIdHash: ownerIdHash(input.menu.ownerId),
      menuId: input.menu.id,
      mealCount: input.menu.meals.length,
      itemCount,
    },
  };
}

export function createFavoriteSavedEvent(input: {
  favorite: FavoriteItem;
  correlationId: string;
  now?: Date;
  eventId?: string;
}): FavoriteSavedEvent {
  return {
    ...newEventBase(input),
    eventType: "favorite.saved.v1",
    producer: "favorites-service",
    payload: {
      ownerIdHash: ownerIdHash(input.favorite.ownerId),
      favoriteId: input.favorite.id,
      source: input.favorite.source,
      sourceId: input.favorite.sourceId,
    },
  };
}
