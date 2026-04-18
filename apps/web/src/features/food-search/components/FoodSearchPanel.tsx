"use client";

import { FoodSearchForm } from "./FoodSearchForm";
import { FoodResultsList } from "./FoodResultsList";
import { FoodResultsToolbar } from "./FoodResultsToolbar";
import { MenuDrawer } from "./MenuDrawer";
import { MenuFloatingButton } from "./MenuFloatingButton";
import { MenuSnackbar } from "./MenuSnackbar";
import { useFoodSearch } from "../hooks/useFoodSearch";

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
    isMenuOpen,
    setIsMenuOpen,
    lastAddedLabel,
    clearLastAddedLabel,
    addToMenu,
    increaseMenuItem,
    decreaseMenuItem,
    removeFromMenu,
    clearMenu,
  } = useFoodSearch();

  const hasResults = status === "success" && items.length > 0;

  function openMenuFromSnackbar() {
    clearLastAddedLabel();
    setIsMenuOpen(true);
  }

  return (
    <section className="space-y-5 pb-24">
      <FoodSearchForm
        query={query}
        status={status}
        onQueryChange={setQuery}
        onSearch={runSearch}
        onReset={resetSearch}
      />

      <section className="min-w-0">
        {status === "idle" && (
          <div className="rounded-3xl bg-emerald-950 p-5 text-white">
            <p className="text-base font-black">Start with a simple food.</p>
            <p className="mt-2 text-sm leading-6 text-emerald-50">
              Try oats, milk, yogurt or chicken. Results will appear here.
            </p>
          </div>
        )}

        {status === "loading" && (
          <div className="rounded-3xl bg-white p-5 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
            Searching foods...
          </div>
        )}

        {status === "error" && (
          <div className="rounded-3xl bg-red-50 p-5 text-sm font-bold text-red-700 ring-1 ring-red-100">
            Could not connect to the local API. Make sure apps/api is running on port 4000.
            {errorMessage ? <p className="mt-2 text-xs">{errorMessage}</p> : null}
          </div>
        )}

        {status === "empty" && (
          <div className="rounded-3xl bg-amber-50 p-5 text-sm font-bold text-amber-700 ring-1 ring-amber-100">
            No results found. Try oats, milk, yogurt or chicken.
          </div>
        )}

        {hasResults && (
          <>
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Results
                </p>
                <h2 className="text-2xl font-black leading-tight">
                  {visibleItems.length} of {items.length} foods for “{searchedQuery}”
                </h2>
              </div>

              <p className="text-xs font-bold text-slate-500">
                Nutrition per 100 g
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
            />

            <div className="mt-5 flex justify-center">
              {hasMore ? (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className="min-h-12 rounded-2xl bg-slate-950 px-6 text-sm font-black text-white"
                >
                  {isLoadingMore ? "Loading..." : "Load more results"}
                </button>
              ) : (
                <p className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500">
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
        onClose={() => setIsMenuOpen(false)}
        onIncrease={increaseMenuItem}
        onDecrease={decreaseMenuItem}
        onRemove={removeFromMenu}
        onClear={clearMenu}
      />
    </section>
  );
}
