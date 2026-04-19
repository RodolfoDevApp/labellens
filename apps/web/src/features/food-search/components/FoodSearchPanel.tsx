"use client";

import { useRef, useState } from "react";
import { AuthModal } from "@/features/auth/components/AuthModal";
import { type AuthSession, useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { type FoodItemDto, saveFavoriteFood } from "@/shared/api/foods-api";
import { FoodSearchForm } from "./FoodSearchForm";
import { FoodResultsList } from "./FoodResultsList";
import { FoodResultsToolbar } from "./FoodResultsToolbar";
import { MenuDrawer } from "./MenuDrawer";
import { MenuFloatingButton } from "./MenuFloatingButton";
import { MenuSnackbar } from "./MenuSnackbar";
import { SavedFoodShortcuts } from "./SavedFoodShortcuts";
import { useFoodSearch } from "../hooks/useFoodSearch";

type PendingFavorite = {
  food: FoodItemDto;
  grams: number;
};

export function FoodSearchPanel() {
  const {
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
    draftName,
    draftDate,
    editingMenuId,
    setDraftName,
    setDraftDate,
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
  } = useFoodSearch();
  const { accessToken } = useAuthSession();
  const [favoriteMessage, setFavoriteMessage] = useState<string | null>(null);
  const [favoriteRefreshSignal, setFavoriteRefreshSignal] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const pendingFavoriteRef = useRef<PendingFavorite | null>(null);

  const hasResults = status === "success" && items.length > 0;

  function openMenuFromSnackbar() {
    clearLastAddedLabel();
    setIsMenuOpen(true);
  }

  async function saveFavoriteWithToken(food: FoodItemDto, grams: number, token: string) {
    await saveFavoriteFood(token, {
      source: food.nutrition.source,
      sourceId: food.nutrition.sourceId,
      displayName: food.name,
      grams,
      nutrition: food.nutrition,
    });
    setFavoriteMessage(`${food.name} saved as favorite.`);
    setFavoriteRefreshSignal((current) => current + 1);
  }

  async function handleSaveFavorite(food: FoodItemDto, grams: number) {
    if (!accessToken) {
      pendingFavoriteRef.current = { food, grams };
      setIsAuthModalOpen(true);
      return;
    }

    try {
      await saveFavoriteWithToken(food, grams, accessToken);
    } catch (error) {
      setFavoriteMessage(error instanceof Error ? error.message : "Could not save favorite.");
    }
  }

  async function handleAuthenticated(session: AuthSession) {
    const pendingFavorite = pendingFavoriteRef.current;
    pendingFavoriteRef.current = null;

    if (!pendingFavorite) {
      return;
    }

    try {
      await saveFavoriteWithToken(pendingFavorite.food, pendingFavorite.grams, session.accessToken);
    } catch (error) {
      setFavoriteMessage(error instanceof Error ? error.message : "Could not save favorite.");
    }
  }

  return (
    <section className="space-y-5 pb-24">
      <FoodSearchForm
        query={query}
        status={status}
        onQueryChange={setQuery}
        onSearch={runSearch}
        onReset={resetSearch}
        headerAction={(
          <SavedFoodShortcuts
            defaultMeal="breakfast"
            refreshSignal={favoriteRefreshSignal}
            onAddToMenu={addToMenu}
          />
        )}
      />

      {favoriteMessage ? (
        <div className="rounded-2xl border border-[#c9e9b5] bg-[#edfbdf] px-5 py-3 text-sm font-black text-[#0b6b47]">
          {favoriteMessage}
        </div>
      ) : null}

      <section className="min-w-0">
        {status === "idle" && (
          <div className="rounded-3xl bg-[#20281f] p-5 text-[#fff8e8] shadow-[0_14px_35px_rgba(32,40,31,0.18)]">
            <p className="text-base font-black">Start with a simple food.</p>
            <p className="mt-2 text-sm leading-6 text-[#efe3ca]">
              Try oats, milk, yogurt or chicken. Results will appear here.
            </p>
          </div>
        )}

        {status === "loading" && (
          <div className="rounded-3xl border border-[#f0d7ad] bg-[#fff8ea] p-5 text-sm font-bold text-[#5d665d] shadow-sm">
            Searching foods...
          </div>
        )}

        {status === "error" && (
          <div className="rounded-3xl border border-[#f0d2c7] bg-[#fff0ea] p-5 text-sm font-bold text-[#9b392f]">
            Could not connect to the local API. Make sure apps/api is running on port 4000.
            {errorMessage ? <p className="mt-2 text-xs">{errorMessage}</p> : null}
          </div>
        )}

        {status === "empty" && (
          <div className="rounded-3xl border border-[#f5d27a] bg-[#fff0b8] p-5 text-sm font-bold text-[#664b00]">
            No results found. Try oats, milk, yogurt or chicken.
          </div>
        )}

        {hasResults && (
          <>
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#0b7a53]">
                  Results
                </p>
                <h2 className="text-2xl font-black leading-tight text-[#18261e]">
                  {visibleItems.length} of {items.length} foods for “{searchedQuery}”
                </h2>
              </div>

              <p className="text-xs font-bold text-[#6b756c]">
                Preview updates with grams
              </p>
            </div>

            <FoodResultsToolbar
              sortBy={sortBy}
              onSortChange={setSortBy}
            />

            <FoodResultsList
              items={visibleItems}
              defaultMeal="breakfast"
              onAddToMenu={addToMenu}
              onSaveFavorite={handleSaveFavorite}
            />

            <div className="mt-5 flex justify-center">
              {hasMore ? (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className="ll-interactive min-h-12 rounded-2xl bg-[#20281f] px-6 text-sm font-black text-white shadow-[0_12px_28px_rgba(32,40,31,0.18)] hover:bg-[#111811] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
                >
                  {isLoadingMore ? "Loading..." : "Load more results"}
                </button>
              ) : (
                <p className="rounded-full border border-[#f0d7ad] bg-[#ffe7ad] px-4 py-2 text-xs font-bold text-[#6b5430]">
                  End of current results
                </p>
              )}
            </div>
          </>
        )}
      </section>

      <MenuSnackbar
        message={lastAddedLabel}
        onViewMenu={openMenuFromSnackbar}
        onDismiss={clearLastAddedLabel}
      />

      <MenuFloatingButton
        itemCount={menuItems.length}
        energyKcal={menuTotals.energyKcal}
        onOpen={() => setIsMenuOpen(true)}
      />

      <MenuDrawer
        isOpen={isMenuOpen}
        items={menuItems}
        totals={menuTotals}
        draftName={draftName}
        draftDate={draftDate}
        editingMenuId={editingMenuId}
        onDraftNameChange={setDraftName}
        onDraftDateChange={setDraftDate}
        onClose={() => setIsMenuOpen(false)}
        onIncrease={increaseMenuItem}
        onDecrease={decreaseMenuItem}
        onUpdateGrams={updateMenuItemGrams}
        onMoveItem={moveMenuItem}
        onRemove={removeFromMenu}
        onClear={clearMenu}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={(session) => void handleAuthenticated(session)}
        title="Save favorite"
        description="Login or register, then this food will be saved for quick reuse."
      />
    </section>
  );
}
