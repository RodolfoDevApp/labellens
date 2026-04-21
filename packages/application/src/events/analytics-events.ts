import { randomUUID } from "node:crypto";
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
  page: number;
  resultCount: number;
  source: "USDA";
  sourceMode: "fixture" | "live";
};

export type ProductScannedEventPayload = {
  barcode: string;
  source: "OPEN_FOOD_FACTS";
  sourceMode: "fixture" | "live";
};

export type MenuSavedEventPayload = {
  ownerId: string;
  menuId: string;
  mealCount: number;
  itemCount: number;
  date?: string;
};

export type FavoriteSavedEventPayload = {
  ownerId: string;
  favoriteId: string;
  source: string;
  sourceId: string;
  defaultGrams: number;
};

export type FoodSearchedEvent = LabelLensEvent<FoodSearchedEventPayload> & {
  eventType: "food.searched.v1";
};

export type ProductScannedEvent = LabelLensEvent<ProductScannedEventPayload> & {
  eventType: "product.scanned.v1";
};

export type MenuSavedEvent = LabelLensEvent<MenuSavedEventPayload> & {
  eventType: "menu.saved.v1";
};

export type FavoriteSavedEvent = LabelLensEvent<FavoriteSavedEventPayload> & {
  eventType: "favorite.saved.v1";
};

export type AnalyticsEvent =
  | FoodSearchedEvent
  | ProductScannedEvent
  | MenuSavedEvent
  | FavoriteSavedEvent;

function newEventBase(input: { correlationId: string; now?: Date; eventId?: string }) {
  return {
    eventId: input.eventId ?? randomUUID(),
    occurredAt: (input.now ?? new Date()).toISOString(),
    correlationId: input.correlationId,
  };
}

export function createFoodSearchedEvent(input: {
  query: string;
  page: number;
  resultCount: number;
  sourceMode: "fixture" | "live";
  correlationId: string;
  now?: Date;
  eventId?: string;
}): FoodSearchedEvent {
  return {
    ...newEventBase(input),
    eventType: "food.searched.v1",
    payload: {
      query: input.query,
      page: input.page,
      resultCount: input.resultCount,
      source: "USDA",
      sourceMode: input.sourceMode,
    },
  };
}

export function createProductScannedEvent(input: {
  barcode: string;
  sourceMode: "fixture" | "live";
  correlationId: string;
  now?: Date;
  eventId?: string;
}): ProductScannedEvent {
  return {
    ...newEventBase(input),
    eventType: "product.scanned.v1",
    payload: {
      barcode: input.barcode,
      source: "OPEN_FOOD_FACTS",
      sourceMode: input.sourceMode,
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
  const payload: MenuSavedEventPayload = {
    ownerId: input.menu.ownerId,
    menuId: input.menu.id,
    mealCount: input.menu.meals.length,
    itemCount,
  };

  if (input.menu.date) {
    payload.date = input.menu.date;
  }

  return {
    ...newEventBase(input),
    eventType: "menu.saved.v1",
    payload,
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
    payload: {
      ownerId: input.favorite.ownerId,
      favoriteId: input.favorite.id,
      source: input.favorite.source,
      sourceId: input.favorite.sourceId,
      defaultGrams: input.favorite.defaultGrams,
    },
  };
}
