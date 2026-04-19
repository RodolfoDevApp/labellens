"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthModal } from "@/features/auth/components/AuthModal";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { mealOptions, type MealKey } from "@/features/menu-draft/hooks/useMenuDraft";
import {
  deleteFavoriteFood,
  listFavoriteFoods,
  type FavoriteItemDto,
  type FoodItemDto,
} from "@/shared/api/foods-api";

type SavedFoodShortcutsProps = {
  defaultMeal: MealKey;
  refreshSignal: number;
  onAddToMenu: (food: FoodItemDto, meal: MealKey, grams: number) => void;
  className?: string;
};

type FeedbackState = { kind: "success" | "error"; message: string } | null;

const FAVORITES_PAGE_SIZE = 10;

function calculate(valuePer100g: number | null | undefined, grams: number): number | null {
  if (valuePer100g === null || valuePer100g === undefined) {
    return null;
  }

  return Number(((valuePer100g * grams) / 100).toFixed(2));
}

function formatKcal(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value} kcal`;
}

function itemToFood(item: FavoriteItemDto): FoodItemDto {
  return {
    id: `${item.source}-${item.sourceId}`,
    name: item.displayName,
    nutrition: item.nutrition,
  };
}

export function SavedFoodShortcuts({
  defaultMeal,
  refreshSignal,
  onAddToMenu,
  className = "",
}: SavedFoodShortcutsProps) {
  const { accessToken, hasHydratedAuth, isAuthenticated } = useAuthSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [meal, setMeal] = useState<MealKey>(defaultMeal);
  const [favorites, setFavorites] = useState<FavoriteItemDto[]>([]);
  const [visibleCount, setVisibleCount] = useState(FAVORITES_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const visibleFavorites = useMemo(
    () => favorites.slice(0, visibleCount),
    [favorites, visibleCount],
  );
  const hasMoreFavorites = visibleCount < favorites.length;

  async function refreshFavorites() {
    if (!accessToken) {
      setFavorites([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await listFavoriteFoods(accessToken);
      setFavorites(result.items);
      setVisibleCount(FAVORITES_PAGE_SIZE);
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not load favorites.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!hasHydratedAuth || !isAuthenticated) {
      return;
    }

    void refreshFavorites();
  }, [accessToken, hasHydratedAuth, isAuthenticated, refreshSignal]);

  useEffect(() => {
    setMeal(defaultMeal);
  }, [defaultMeal]);

  function openFavorites() {
    setFeedback(null);
    setVisibleCount(FAVORITES_PAGE_SIZE);
    setIsOpen(true);

    if (hasHydratedAuth && isAuthenticated) {
      void refreshFavorites();
    }
  }

  function closeFavorites() {
    setIsOpen(false);
    setFeedback(null);
  }

  function addFavorite(item: FavoriteItemDto) {
    onAddToMenu(itemToFood(item), meal, item.defaultGrams);
    setFeedback({ kind: "success", message: `${item.displayName} added to ${meal}.` });
  }

  async function removeFavorite(itemId: string) {
    if (!accessToken) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      await deleteFavoriteFood(accessToken, itemId);
      setFavorites((current) => current.filter((item) => item.id !== itemId));
      setFeedback({ kind: "success", message: "Favorite removed." });
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Could not remove favorite." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openFavorites}
        className={`ll-interactive inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[#c9e9b5] bg-[#edfbdf] px-4 text-sm font-black uppercase tracking-[0.08em] text-[#0b6b47] shadow-sm hover:border-[#89c76d] hover:bg-[#dff6c8] focus:outline-none focus:ring-2 focus:ring-[#ffb84d] ${className}`}
      >
        <span>Favorites</span>
        <span className="rounded-full bg-[#fff8ea] px-2 py-0.5 text-[0.7rem] leading-5 text-[#18261e] ring-1 ring-[#c9e9b5]">
          {favorites.length > 0 ? favorites.length : "Open"}
        </span>
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-[#18261e]/55 px-3 py-4 backdrop-blur-sm sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="favorites-modal-title"
        >
          <section className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[#f0d7ad] bg-[#fff8ea] shadow-[0_30px_80px_rgba(24,38,30,0.35)]">
            <header className="flex items-start justify-between gap-4 border-b border-[#f0d7ad] px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0b7a53]">
                  Favorites
                </p>
                <h2 id="favorites-modal-title" className="mt-1 text-2xl font-black leading-tight text-[#18261e]">
                  Add saved foods to your menu
                </h2>
                <p className="mt-1 text-sm font-bold text-[#687468]">
                  Favorites load 10 at a time. They are shortcuts, not pantry inventory.
                </p>
              </div>

              <button
                type="button"
                onClick={closeFavorites}
                className="ll-interactive grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#e8cfa4] bg-[#fff4df] text-xl font-black text-[#5d4c31] hover:bg-[#ffe7ad] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
                aria-label="Close favorites"
              >
                ×
              </button>
            </header>

            <div className="max-h-[calc(88vh-112px)] space-y-4 overflow-y-auto px-5 py-4">
              {!hasHydratedAuth ? (
                <p className="rounded-2xl bg-[#fff4df] p-4 text-sm font-bold text-[#6b5941]">Loading auth...</p>
              ) : !isAuthenticated ? (
                <div className="rounded-2xl border border-[#e8cfa4] bg-[#fff4df] p-4">
                  <p className="text-sm font-bold text-[#536052]">
                    Login to reuse foods you saved before.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="ll-interactive mt-3 min-h-11 rounded-2xl bg-[#0b7a53] px-5 text-sm font-black text-white hover:bg-[#075f41] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
                  >
                    Login or register
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <label className="grid gap-1 text-xs font-black text-[#465246]">
                      Add favorites to
                      <select
                        value={meal}
                        onChange={(event) => setMeal(event.target.value as MealKey)}
                        className="min-h-11 rounded-2xl border border-[#e8cfa4] bg-[#fffaf0] px-4 text-sm font-black text-[#18261e] outline-none focus:border-[#0b7a53] focus:ring-2 focus:ring-[#c9f0a0]"
                      >
                        {mealOptions.map((option) => (
                          <option key={option.key} value={option.key}>{option.label}</option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() => void refreshFavorites()}
                      disabled={isLoading}
                      className="ll-interactive min-h-11 rounded-2xl bg-[#edfbdf] px-5 text-sm font-black text-[#0b6b47] ring-1 ring-[#c9e9b5] disabled:opacity-60"
                    >
                      {isLoading ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>

                  {feedback ? (
                    <p
                      role={feedback.kind === "error" ? "alert" : "status"}
                      className={`rounded-2xl border px-4 py-2 text-sm font-bold ${
                        feedback.kind === "error"
                          ? "border-[#f0d2c7] bg-[#fff0ea] text-[#9b392f]"
                          : "border-[#c9e9b5] bg-[#edfbdc] text-[#0b6b47]"
                      }`}
                    >
                      {feedback.message}
                    </p>
                  ) : null}

                  <div className="space-y-2">
                    {visibleFavorites.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-[#e8cfa4] bg-[#fff4df] p-4 text-sm font-bold text-[#6b5941]">
                        No favorites yet. Save a food from search results or a scanned product.
                      </p>
                    ) : (
                      visibleFavorites.map((item) => (
                        <article key={item.id} className="rounded-2xl border border-[#e8cfa4] bg-[#fffaf0] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="ll-line-clamp-1 text-sm font-black text-[#18261e]">{item.displayName}</h4>
                              <p className="mt-1 text-xs font-bold text-[#687468]">
                                {item.defaultGrams} g · {formatKcal(calculate(item.nutrition.energyKcalPer100g, item.defaultGrams))}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addFavorite(item)}
                              className="ll-interactive min-h-9 rounded-full bg-[#0b7a53] px-4 text-xs font-black text-white hover:bg-[#075f41] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
                            >
                              Add
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => void removeFavorite(item.id)}
                            className="mt-2 text-xs font-black text-[#96331f] underline-offset-4 hover:underline"
                          >
                            Remove favorite
                          </button>
                        </article>
                      ))
                    )}
                  </div>

                  {hasMoreFavorites ? (
                    <button
                      type="button"
                      onClick={() => setVisibleCount((current) => current + FAVORITES_PAGE_SIZE)}
                      className="ll-interactive min-h-11 w-full rounded-2xl bg-[#20281f] px-5 text-sm font-black text-white hover:bg-[#111811] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
                    >
                      Show next 10
                    </button>
                  ) : favorites.length > 0 ? (
                    <p className="text-center text-xs font-bold text-[#687468]">
                      Showing all {favorites.length} favorites.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </section>
        </div>
      ) : null}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={() => {
          void refreshFavorites();
        }}
        title="Login or register"
        description="Favorites stay on your account so you can add them without searching again."
      />
    </>
  );
}
