"use client";

import { useMemo, useState } from "react";
import { type FoodItemDto, searchFoods } from "@/shared/api/foods-api";

type SearchStatus = "idle" | "loading" | "success" | "empty" | "error";

export type MealKey = "breakfast" | "lunch" | "dinner" | "snack";
export type SortKey = "relevance" | "kcal" | "protein" | "carbs" | "fat";

export type MenuDraftItem = {
  id: string;
  meal: MealKey;
  food: FoodItemDto;
  grams: number;
};

export const mealOptions: Array<{ key: MealKey; label: string }> = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
];

const PAGE_SIZE = 10;
const DEFAULT_GRAMS = 100;

function calculateMacro(valuePer100g: number | null, grams: number): number | null {
  if (valuePer100g === null) {
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

function sortValue(food: FoodItemDto, sortBy: SortKey): number {
  switch (sortBy) {
    case "kcal":
      return food.nutrition.energyKcalPer100g ?? -1;
    case "protein":
      return food.nutrition.proteinGPer100g ?? -1;
    case "carbs":
      return food.nutrition.carbsGPer100g ?? -1;
    case "fat":
      return food.nutrition.fatGPer100g ?? -1;
    default:
      return 0;
  }
}

export function useFoodSearch() {
  const [query, setQuery] = useState("oats");
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const [items, setItems] = useState<FoodItemDto[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortKey>("relevance");

  const [menuItems, setMenuItems] = useState<MenuDraftItem[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastAddedLabel, setLastAddedLabel] = useState<string | null>(null);

  async function runSearch(nextQuery = query) {
    const trimmed = nextQuery.trim();

    if (trimmed.length < 2) {
      setStatus("empty");
      setItems([]);
      setSearchedQuery(null);
      setPage(1);
      setHasMore(false);
      setErrorMessage(null);
      return;
    }

    setStatus("loading");
    setErrorMessage(null);
    setSearchedQuery(trimmed);
    setPage(1);
    setSortBy("relevance");

    try {
      const result = await searchFoods(trimmed, 1);

      setItems(result.items);
      setStatus(result.items.length > 0 ? "success" : "empty");
      setHasMore(result.items.length >= PAGE_SIZE);
    } catch (error) {
      setStatus("error");
      setItems([]);
      setHasMore(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Food search failed.",
      );
    }
  }

  async function loadMore() {
    if (!searchedQuery || isLoadingMore || !hasMore) {
      return;
    }

    const nextPage = page + 1;
    setIsLoadingMore(true);
    setErrorMessage(null);

    try {
      const result = await searchFoods(searchedQuery, nextPage);

      setItems((currentItems) => [...currentItems, ...result.items]);
      setPage(nextPage);
      setHasMore(result.items.length >= PAGE_SIZE);
      setStatus("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not load more results.",
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  function resetSearch() {
    setQuery("");
    setSearchedQuery(null);
    setItems([]);
    setStatus("idle");
    setPage(1);
    setHasMore(false);
    setIsLoadingMore(false);
    setErrorMessage(null);
    setSortBy("relevance");
  }

  function addToMenu(food: FoodItemDto, meal: MealKey) {
    setMenuItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.food.id === food.id && item.meal === meal,
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === existingItem.id
            ? { ...item, grams: item.grams + DEFAULT_GRAMS }
            : item,
        );
      }

      return [
        ...currentItems,
        {
          id: `${meal}-${food.id}`,
          meal,
          food,
          grams: DEFAULT_GRAMS,
        },
      ];
    });

    const mealLabel = mealOptions.find((option) => option.key === meal)?.label ?? "Meal";
    setLastAddedLabel(`Added 100 g to ${mealLabel}`);
  }

  function clearLastAddedLabel() {
    setLastAddedLabel(null);
  }

  function increaseMenuItem(itemId: string) {
    setMenuItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, grams: item.grams + DEFAULT_GRAMS } : item,
      ),
    );
  }

  function decreaseMenuItem(itemId: string) {
    setMenuItems((currentItems) =>
      currentItems.flatMap((item) => {
        if (item.id !== itemId) {
          return [item];
        }

        const nextGrams = item.grams - DEFAULT_GRAMS;

        if (nextGrams <= 0) {
          return [];
        }

        return [{ ...item, grams: nextGrams }];
      }),
    );
  }

  function removeFromMenu(itemId: string) {
    setMenuItems((currentItems) =>
      currentItems.filter((item) => item.id !== itemId),
    );
  }

  function clearMenu() {
    setMenuItems([]);
    setLastAddedLabel(null);
  }

  const visibleItems = useMemo(() => {
    if (sortBy === "relevance") {
      return items;
    }

    return [...items].sort(
      (left, right) => sortValue(right, sortBy) - sortValue(left, sortBy),
    );
  }, [items, sortBy]);

  const menuTotals = useMemo(() => {
    return {
      energyKcal: sumNullable(
        menuItems.map((item) =>
          calculateMacro(item.food.nutrition.energyKcalPer100g, item.grams),
        ),
      ),
      proteinG: sumNullable(
        menuItems.map((item) =>
          calculateMacro(item.food.nutrition.proteinGPer100g, item.grams),
        ),
      ),
      carbsG: sumNullable(
        menuItems.map((item) =>
          calculateMacro(item.food.nutrition.carbsGPer100g, item.grams),
        ),
      ),
      fatG: sumNullable(
        menuItems.map((item) =>
          calculateMacro(item.food.nutrition.fatGPer100g, item.grams),
        ),
      ),
    };
  }, [menuItems]);

  return {
    query,
    setQuery,
    searchedQuery,
    items,
    visibleItems,
    status,
    errorMessage,
    hasMore,
    isLoadingMore,
    runSearch,
    loadMore,
    resetSearch,

    sortBy,
    setSortBy,

    menuItems,
    menuTotals,
    isMenuOpen,
    setIsMenuOpen,
    lastAddedLabel,
    clearLastAddedLabel,
    addToMenu,
    increaseMenuItem,
    decreaseMenuItem,
    removeFromMenu,
    clearMenu,
  };
}
