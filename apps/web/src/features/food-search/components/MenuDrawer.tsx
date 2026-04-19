"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { AuthModal } from "@/features/auth/components/AuthModal";
import { type AuthSession, useAuthSession } from "@/features/auth/hooks/useAuthSession";
import {
  type MealKey,
  type MenuDraftItem,
  mealOptions,
} from "@/features/menu-draft/hooks/useMenuDraft";
import { buildSaveMenuPayload } from "@/features/menu-draft/lib/menuSavePayload";
import { saveMenuDraft, updateSavedMenu, type MenuTotalsDto } from "@/shared/api/foods-api";
import { MacroTile } from "@/shared/ui/MacroTile";
import { PartialDataNotice } from "@/shared/ui/PartialDataNotice";

type MenuDrawerProps = {
  isOpen: boolean;
  items: MenuDraftItem[];
  totals: MenuTotalsDto;
  draftName: string;
  draftDate: string;
  editingMenuId: string | null;
  onDraftNameChange: (name: string) => void;
  onDraftDateChange: (date: string) => void;
  onClose: () => void;
  onIncrease: (itemId: string) => void;
  onDecrease: (itemId: string) => void;
  onUpdateGrams: (itemId: string, grams: number) => void;
  onMoveItem: (itemId: string, meal: MealKey) => void;
  onRemove: (itemId: string) => void;
  onClear: () => void;
};

const mealIcons: Record<MealKey, string> = {
  breakfast: "☀️",
  lunch: "🥗",
  dinner: "🍲",
  snack: "🍎",
};

function formatMacro(value: number | null | undefined, suffix = ""): string {
  return value === null || value === undefined ? "—" : `${value}${suffix}`;
}

function itemsByMeal(items: MenuDraftItem[], meal: MealKey): MenuDraftItem[] {
  return items.filter((item) => item.meal === meal);
}

function parseGrams(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.max(1, Math.min(10000, Math.round(parsed)));
}

export function MenuDrawer({
  isOpen,
  items,
  totals,
  draftName,
  draftDate,
  editingMenuId,
  onDraftNameChange,
  onDraftDateChange,
  onClose,
  onIncrease,
  onDecrease,
  onUpdateGrams,
  onMoveItem,
  onRemove,
  onClear,
}: MenuDrawerProps) {
  const router = useRouter();
  const [expandedMeals, setExpandedMeals] = useState<Record<MealKey, boolean>>({
    breakfast: true,
    lunch: true,
    dinner: true,
    snack: true,
  });
  const { accessToken } = useAuthSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const pendingSaveRef = useRef(false);

  const mealCounts = useMemo(
    () =>
      mealOptions.reduce<Record<MealKey, number>>((counts, meal) => {
        counts[meal.key] = itemsByMeal(items, meal.key).length;
        return counts;
      }, {
        breakfast: 0,
        lunch: 0,
        dinner: 0,
        snack: 0,
      }),
    [items],
  );

  if (!isOpen) {
    return null;
  }

  function toggleMeal(meal: MealKey) {
    setExpandedMeals((current) => ({
      ...current,
      [meal]: !current[meal],
    }));
  }

  async function saveCurrentMenu(tokenOverride?: string) {
    if (items.length === 0 || saveState === "saving") {
      return;
    }

    const normalizedName = draftName.trim();

    if (normalizedName.length < 2) {
      setSaveState("error");
      setSaveMessage("Give this menu a clear name before saving.");
      return;
    }

    const token = tokenOverride ?? accessToken;

    if (!token) {
      pendingSaveRef.current = true;
      setIsAuthModalOpen(true);
      return;
    }

    setSaveState("saving");
    setSaveMessage(null);

    try {
      const payload = buildSaveMenuPayload(items, { name: normalizedName, date: draftDate });
      const result = editingMenuId
        ? await updateSavedMenu(token, editingMenuId, payload)
        : await saveMenuDraft(token, payload);
      pendingSaveRef.current = false;
      setSaveState("saved");
      setSaveMessage(editingMenuId ? `${result.menu.name} updated.` : `${result.menu.name} saved.`);
      onClear();
      onClose();
      router.push("/menu");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "Menu save failed.");
      throw error;
    }
  }

  async function onAuthenticated(session: AuthSession) {
    if (pendingSaveRef.current) {
      await saveCurrentMenu(session.accessToken);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close menu draft"
        onClick={onClose}
        className="ll-fade-in absolute inset-0 bg-[#25140b]/55 transition-colors duration-200 ease-out hover:bg-[#25140b]/60"
      />

      <aside className="ll-drawer-in absolute inset-0 flex h-dvh flex-col overflow-hidden bg-[#f5ecd8] shadow-2xl md:left-auto md:w-[62vw] md:max-w-[900px] md:border-l md:border-[#efd8b7]">
        <header className="shrink-0 border-b border-[#ecd4aa] bg-[#fff1d1]/95 px-4 py-4 backdrop-blur md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-[#0b7a53]">
                {editingMenuId ? "Editing saved menu" : "New menu"}
              </p>
              <h2 className="mt-1 text-3xl font-black leading-tight text-[#19251d]">
                {draftName.trim() || "Name this menu"}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#5d665d]">
                {items.length} {items.length === 1 ? "food" : "foods"}. Edit grams and meals, then {editingMenuId ? "update it" : "save it"}.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu draft"
              className="ll-interactive flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#f2d59e] bg-[#fff8ea] text-2xl font-black leading-none text-[#243027] shadow-[0_10px_24px_rgba(88,61,24,0.12)] hover:bg-[#ffefc2] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
            >
              ×
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-xs font-black text-[#465246]">
              Menu name
              <input
                value={draftName}
                onChange={(event) => onDraftNameChange(event.target.value)}
                placeholder="Example: High protein Monday"
                className="min-h-11 rounded-2xl border border-[#f0d7ad] bg-[#fff8ea] px-4 text-sm font-black text-[#18261e] outline-none focus:border-[#0b7a53] focus:ring-2 focus:ring-[#c9f0a0]"
              />
            </label>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <MacroTile value={formatMacro(totals.energyKcal)} label="kcal" tone="sun" />
            <MacroTile value={formatMacro(totals.proteinG, "g")} label="Protein" tone="leaf" />
            <MacroTile value={formatMacro(totals.carbsG, "g")} label="Carbs" tone="berry" />
            <MacroTile value={formatMacro(totals.fatG, "g")} label="Fat" tone="peach" />
          </div>

          <div className="mt-3 space-y-2">
            <PartialDataNotice
              show={totals.partialData && items.length > 0}
              label="Some totals are partial because a food is missing values."
            />
            {saveMessage ? (
              <p
                role={saveState === "error" ? "alert" : "status"}
                className={`rounded-2xl border px-3 py-2 text-xs font-bold ${
                  saveState === "error"
                    ? "border-[#f0d2c7] bg-[#fff0ea] text-[#9b392f]"
                    : "border-[#c9e9b5] bg-[#edfbdc] text-[#0b6b47]"
                }`}
              >
                {saveMessage}
              </p>
            ) : null}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
          <div className="space-y-3">
            {mealOptions.map((meal) => {
              const mealItems = itemsByMeal(items, meal.key);
              const isExpanded = expandedMeals[meal.key];
              const panelId = `menu-meal-panel-${meal.key}`;
              const buttonId = `menu-meal-button-${meal.key}`;

              return (
                <section
                  key={meal.key}
                  className="overflow-hidden rounded-[1.6rem] border border-[#f0d7ad] bg-[#fff8ea] shadow-[0_14px_35px_rgba(88,61,24,0.08)]"
                >
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      onClick={() => toggleMeal(meal.key)}
                      className="flex min-h-14 w-full items-center justify-between gap-3 bg-[#ffe7ad] px-4 text-left hover:bg-[#ffd98a] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#ffb84d]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#fff8ea] text-lg shadow-sm ring-1 ring-[#f0d7ad]">
                          {mealIcons[meal.key]}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-black uppercase tracking-wide text-[#465246]">
                            {meal.label}
                          </span>
                          <span className="block text-xs font-bold text-[#7c6a4d]">
                            {mealCounts[meal.key]} {mealCounts[meal.key] === 1 ? "item" : "items"}
                          </span>
                        </span>
                      </span>

                      <span className="flex items-center gap-2">
                        <span className="rounded-full bg-[#fff8ea] px-3 py-1 text-xs font-black text-[#0b7a53] ring-1 ring-[#f0d7ad]">
                          {mealItems.length}
                        </span>
                        <span className="text-lg font-black text-[#6b5430]">
                          {isExpanded ? "−" : "+"}
                        </span>
                      </span>
                    </button>
                  </h3>

                  {isExpanded ? (
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="space-y-2 p-3"
                    >
                      {mealItems.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-[#efd8b7] bg-[#f5ecd8] p-4 text-sm font-bold text-[#8a7553]">
                          No foods added yet.
                        </div>
                      ) : (
                        mealItems.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-3xl border border-[#eef0df] bg-[#f7ffe9] p-3 shadow-[0_8px_24px_rgba(60,89,52,0.06)]"
                          >
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                              <div className="min-w-0">
                                <p className="ll-line-clamp-2 text-sm font-black leading-tight text-[#18261e]">
                                  {item.food.name}
                                </p>
                                <select
                                  value={item.meal}
                                  onChange={(event) => onMoveItem(item.id, event.target.value as MealKey)}
                                  aria-label={`Move ${item.food.name} to another meal`}
                                  className="mt-2 min-h-9 rounded-full border border-[#d8e7bd] bg-[#fff8ea] px-3 text-xs font-black text-[#344538] outline-none focus:border-[#0b7a53] focus:ring-2 focus:ring-[#c9f0a0]"
                                >
                                  {mealOptions.map((option) => (
                                    <option key={option.key} value={option.key}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="grid grid-cols-[42px_minmax(80px,1fr)_42px_auto] items-center gap-2 sm:w-[350px]">
                                <button
                                  type="button"
                                  onClick={() => onDecrease(item.id)}
                                  className="ll-interactive flex h-10 w-10 items-center justify-center rounded-full border border-[#d8e7bd] bg-[#fff8ea] text-lg font-black text-[#2d4a32] hover:bg-[#ecf9db] focus:outline-none focus:ring-2 focus:ring-[#b8e07a]"
                                  aria-label={`Decrease ${item.food.name}`}
                                >
                                  −
                                </button>

                                <label className="sr-only" htmlFor={`grams-${item.id}`}>
                                  Grams for {item.food.name}
                                </label>
                                <input
                                  id={`grams-${item.id}`}
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  max={10000}
                                  value={item.grams}
                                  onChange={(event) => onUpdateGrams(item.id, parseGrams(event.target.value))}
                                  className="min-h-10 rounded-2xl border border-[#d8e7bd] bg-[#fff8ea] px-3 text-center text-sm font-black text-[#18261e] outline-none focus:border-[#0b7a53] focus:ring-2 focus:ring-[#c9f0a0]"
                                />

                                <button
                                  type="button"
                                  onClick={() => onIncrease(item.id)}
                                  className="ll-interactive flex h-10 w-10 items-center justify-center rounded-full border border-[#d8e7bd] bg-[#fff8ea] text-lg font-black text-[#2d4a32] hover:bg-[#ecf9db] focus:outline-none focus:ring-2 focus:ring-[#b8e07a]"
                                  aria-label={`Increase ${item.food.name}`}
                                >
                                  +
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onRemove(item.id)}
                                  className="ll-interactive min-h-10 rounded-full border border-[#f0d2c7] bg-[#fff8ea] px-3 text-xs font-black text-[#9b392f] hover:bg-[#fff0ea] focus:outline-none focus:ring-2 focus:ring-[#ffb8a8]"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>

        {items.length > 0 ? (
          <footer className="shrink-0 border-t border-[#ecd4aa] bg-[#fff1d1]/95 p-4 backdrop-blur md:px-6">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                onClick={() => void saveCurrentMenu()}
                disabled={saveState === "saving"}
                className="ll-interactive min-h-12 rounded-2xl bg-[#0b7a53] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(11,122,83,0.2)] hover:bg-[#075f41] focus:outline-none focus:ring-2 focus:ring-[#ffb84d] disabled:opacity-60"
              >
                {saveState === "saving" ? "Saving..." : editingMenuId ? "Update menu" : "Save menu"}
              </button>
              <button
                type="button"
                onClick={onClear}
                className="ll-interactive min-h-12 rounded-2xl bg-[#20281f] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(32,40,31,0.2)] hover:bg-[#111811] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
              >
                {editingMenuId ? "Cancel edit" : "Clear menu"}
              </button>
            </div>
          </footer>
        ) : null}
      </aside>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={(session) => void onAuthenticated(session)}
        title="Save your menu"
        description="Login or register, then this menu will be saved to your menus."
      />
    </div>
  );
}
