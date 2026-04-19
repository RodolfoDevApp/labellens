"use client";

import { useEffect, useMemo, useState } from "react";
import { type FoodItemDto, type MenuTotalsDto, type SavedMenuDto } from "@/shared/api/foods-api";

export type MealKey = "breakfast" | "lunch" | "dinner" | "snack";

export type MenuDraftItem = {
  id: string;
  meal: MealKey;
  food: FoodItemDto;
  grams: number;
  addedAt: string;
};

export type MenuDraftMeta = {
  name: string;
  date: string;
  editingMenuId: string | null;
};

export const mealOptions: Array<{ key: MealKey; label: string }> = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
];

const STORAGE_KEY = "labellens.menuDraft.v1";
const META_STORAGE_KEY = "labellens.menuDraft.meta.v1";
const DRAFT_EVENT_NAME = "labellens:menu-draft-updated";
const DEFAULT_GRAMS = 40;
const GRAM_STEP = 10;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultMeta(): MenuDraftMeta {
  return {
    name: "",
    date: todayIsoDate(),
    editingMenuId: null,
  };
}

function sanitizeGrams(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_GRAMS;
  }

  return Math.min(10000, Math.max(1, Math.round(value)));
}

function calculateMacro(valuePer100g: number | null | undefined, grams: number): number | null {
  if (valuePer100g === null || valuePer100g === undefined) {
    return null;
  }

  return Number(((valuePer100g * grams) / 100).toFixed(2));
}

function sumNullable(values: Array<number | null>): number | null {
  const validValues = values.filter((value): value is number => value !== null);

  if (validValues.length === 0) {
    return null;
  }

  return Number(validValues.reduce((sum, value) => sum + value, 0).toFixed(2));
}

function isMealKey(value: unknown): value is MealKey {
  return typeof value === "string" && mealOptions.some((meal) => meal.key === value);
}

function isFoodItem(value: unknown): value is FoodItemDto {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<FoodItemDto>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    !!candidate.nutrition &&
    typeof candidate.nutrition === "object"
  );
}

function normalizeStoredItems(value: unknown): MenuDraftItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): MenuDraftItem[] => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const candidate = item as Partial<MenuDraftItem>;

    if (
      typeof candidate.id !== "string" ||
      !isMealKey(candidate.meal) ||
      !isFoodItem(candidate.food) ||
      typeof candidate.grams !== "number"
    ) {
      return [];
    }

    return [
      {
        id: candidate.id,
        meal: candidate.meal,
        food: candidate.food,
        grams: sanitizeGrams(candidate.grams),
        addedAt: typeof candidate.addedAt === "string" ? candidate.addedAt : new Date().toISOString(),
      },
    ];
  });
}

function normalizeStoredMeta(value: unknown): MenuDraftMeta {
  const fallback = defaultMeta();

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<MenuDraftMeta>;
  const date = typeof candidate.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate.date)
    ? candidate.date
    : fallback.date;
  const name = typeof candidate.name === "string" ? candidate.name : "";

  return {
    name,
    date,
    editingMenuId: typeof candidate.editingMenuId === "string" ? candidate.editingMenuId : null,
  };
}

function readStoredItems(): MenuDraftItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return normalizeStoredItems(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function readStoredMeta(): MenuDraftMeta {
  if (typeof window === "undefined") {
    return defaultMeta();
  }

  try {
    return normalizeStoredMeta(JSON.parse(window.localStorage.getItem(META_STORAGE_KEY) ?? "null"));
  } catch {
    return defaultMeta();
  }
}

function dispatchDraftEvent() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DRAFT_EVENT_NAME));
  }
}

function writeStoredItems(items: MenuDraftItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  dispatchDraftEvent();
}

function writeStoredMeta(meta: MenuDraftMeta) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
  dispatchDraftEvent();
}

function menuItemsFromSavedMenu(menu: SavedMenuDto): MenuDraftItem[] {
  return menu.meals.flatMap((meal) =>
    meal.items.map((item, index) => ({
      id: `${meal.type}-${item.source}-${item.sourceId}-${index}-${Date.now()}`,
      meal: meal.type,
      food: {
        id: item.sourceId,
        name: item.displayName,
        nutrition: item.nutrition,
      },
      grams: sanitizeGrams(item.grams),
      addedAt: new Date().toISOString(),
    })),
  );
}

function calculateTotals(menuItems: MenuDraftItem[]): MenuTotalsDto {
  const energyKcal = sumNullable(
    menuItems.map((item) => calculateMacro(item.food.nutrition.energyKcalPer100g, item.grams)),
  );
  const proteinG = sumNullable(
    menuItems.map((item) => calculateMacro(item.food.nutrition.proteinGPer100g, item.grams)),
  );
  const carbsG = sumNullable(
    menuItems.map((item) => calculateMacro(item.food.nutrition.carbsGPer100g, item.grams)),
  );
  const fatG = sumNullable(
    menuItems.map((item) => calculateMacro(item.food.nutrition.fatGPer100g, item.grams)),
  );

  return {
    energyKcal,
    proteinG,
    carbsG,
    fatG,
    sugarG: sumNullable(
      menuItems.map((item) => calculateMacro(item.food.nutrition.sugarGPer100g, item.grams)),
    ),
    fiberG: sumNullable(
      menuItems.map((item) => calculateMacro(item.food.nutrition.fiberGPer100g, item.grams)),
    ),
    sodiumMg: sumNullable(
      menuItems.map((item) => calculateMacro(item.food.nutrition.sodiumMgPer100g, item.grams)),
    ),
    partialData:
      menuItems.some((item) => item.food.nutrition.completeness !== "COMPLETE") ||
      [energyKcal, proteinG, carbsG, fatG].some((value) => value === null),
  };
}

export function useMenuDraft() {
  const [menuItems, setMenuItems] = useState<MenuDraftItem[]>([]);
  const [draftMeta, setDraftMetaState] = useState<MenuDraftMeta>(defaultMeta);
  const [hasHydratedMenuDraft, setHasHydratedMenuDraft] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastAddedLabel, setLastAddedLabel] = useState<string | null>(null);

  useEffect(() => {
    setMenuItems(readStoredItems());
    setDraftMetaState(readStoredMeta());
    setHasHydratedMenuDraft(true);

    function syncFromStorage() {
      setMenuItems(readStoredItems());
      setDraftMetaState(readStoredMeta());
    }

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(DRAFT_EVENT_NAME, syncFromStorage);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(DRAFT_EVENT_NAME, syncFromStorage);
    };
  }, []);

  function persistItems(updater: (currentItems: MenuDraftItem[]) => MenuDraftItem[]) {
    setMenuItems((currentItems) => {
      const nextItems = updater(currentItems);
      writeStoredItems(nextItems);
      return nextItems;
    });
  }

  function persistMeta(updater: (currentMeta: MenuDraftMeta) => MenuDraftMeta) {
    setDraftMetaState((currentMeta) => {
      const nextMeta = normalizeStoredMeta(updater(currentMeta));
      writeStoredMeta(nextMeta);
      return nextMeta;
    });
  }

  function setDraftName(name: string) {
    persistMeta((currentMeta) => ({ ...currentMeta, name }));
  }

  function setDraftDate(date: string) {
    persistMeta((currentMeta) => ({
      ...currentMeta,
      date,
    }));
  }

  function addToMenu(food: FoodItemDto, meal: MealKey, grams = DEFAULT_GRAMS) {
    const nextGrams = sanitizeGrams(grams);

    persistItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.food.id === food.id && item.meal === meal,
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === existingItem.id
            ? { ...item, grams: sanitizeGrams(item.grams + nextGrams) }
            : item,
        );
      }

      return [
        ...currentItems,
        {
          id: `${meal}-${food.id}-${Date.now()}`,
          meal,
          food,
          grams: nextGrams,
          addedAt: new Date().toISOString(),
        },
      ];
    });

    const mealLabel = mealOptions.find((option) => option.key === meal)?.label ?? "Meal";
    setLastAddedLabel(`Added ${nextGrams} g to ${mealLabel}`);
  }

  function clearLastAddedLabel() {
    setLastAddedLabel(null);
  }

  function increaseMenuItem(itemId: string) {
    persistItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, grams: sanitizeGrams(item.grams + GRAM_STEP) } : item,
      ),
    );
  }

  function decreaseMenuItem(itemId: string) {
    persistItems((currentItems) =>
      currentItems.flatMap((item) => {
        if (item.id !== itemId) {
          return [item];
        }

        const nextGrams = item.grams - GRAM_STEP;

        if (nextGrams <= 0) {
          return [];
        }

        return [{ ...item, grams: sanitizeGrams(nextGrams) }];
      }),
    );
  }

  function updateMenuItemGrams(itemId: string, grams: number) {
    persistItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, grams: sanitizeGrams(grams) } : item,
      ),
    );
  }

  function moveMenuItem(itemId: string, meal: MealKey) {
    persistItems((currentItems) =>
      currentItems.map((item) => (item.id === itemId ? { ...item, meal } : item)),
    );
  }

  function removeFromMenu(itemId: string) {
    persistItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }

  function resetDraftMeta() {
    persistMeta(() => defaultMeta());
  }

  function clearMenu() {
    persistItems(() => []);
    resetDraftMeta();
    setLastAddedLabel(null);
  }

  function replaceDraftWithSavedMenu(menu: SavedMenuDto) {
    const nextItems = menuItemsFromSavedMenu(menu);
    persistItems(() => nextItems);
    persistMeta(() => ({
      name: menu.name,
      date: menu.date,
      editingMenuId: menu.id,
    }));
    setLastAddedLabel(`${menu.name} is ready to update`);
  }

  const menuTotals = useMemo<MenuTotalsDto>(() => calculateTotals(menuItems), [menuItems]);

  return {
    menuItems,
    menuTotals,
    draftMeta,
    draftName: draftMeta.name,
    draftDate: draftMeta.date,
    editingMenuId: draftMeta.editingMenuId,
    hasHydratedMenuDraft,
    isMenuOpen,
    setIsMenuOpen,
    lastAddedLabel,
    clearLastAddedLabel,
    addToMenu,
    increaseMenuItem,
    decreaseMenuItem,
    updateMenuItemGrams,
    moveMenuItem,
    removeFromMenu,
    clearMenu,
    setDraftName,
    setDraftDate,
    replaceDraftWithSavedMenu,
  };
}
