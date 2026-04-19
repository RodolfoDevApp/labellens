"use client";

import { useMemo, useState } from "react";
import { type FoodItemDto, searchFoods } from "@/shared/api/foods-api";
import { useMenuDraft } from "@/features/menu-draft/hooks/useMenuDraft";

export type SortKey = "relevance" | "kcal" | "protein" | "carbs" | "fat";
type SearchStatus = "idle" | "loading" | "success" | "empty" | "error";

const PAGE_SIZE = 10;

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
  const menuDraft = useMenuDraft();

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

  const visibleItems = useMemo(() => {
    if (sortBy === "relevance") {
      return items;
    }

    return [...items].sort(
      (left, right) => sortValue(right, sortBy) - sortValue(left, sortBy),
    );
  }, [items, sortBy]);

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

    ...menuDraft,
  };
}
