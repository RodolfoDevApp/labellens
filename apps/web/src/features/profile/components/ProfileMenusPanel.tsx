"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AuthModal } from "@/features/auth/components/AuthModal";
import { type AuthSession, useAuthSession } from "@/features/auth/hooks/useAuthSession";
import {
  mealOptions,
  type MealKey,
  type MenuDraftItem,
  useMenuDraft,
} from "@/features/menu-draft/hooks/useMenuDraft";
import { buildSaveMenuPayload } from "@/features/menu-draft/lib/menuSavePayload";
import {
  deleteSavedMenu,
  listSavedMenus,
  saveMenuDraft,
  updateSavedMenu,
  type MenuTotalsDto,
  type NutritionFactsDto,
  type SavedMenuDto,
} from "@/shared/api/foods-api";
import { MacroTile } from "@/shared/ui/MacroTile";
import { PartialDataNotice } from "@/shared/ui/PartialDataNotice";

const mealIcons: Record<MealKey, string> = {
  breakfast: "☀️",
  lunch: "🥗",
  dinner: "🍲",
  snack: "🍎",
};

const weekDays = [
  { key: "mon", label: "Mon", fullLabel: "Monday" },
  { key: "tue", label: "Tue", fullLabel: "Tuesday" },
  { key: "wed", label: "Wed", fullLabel: "Wednesday" },
  { key: "thu", label: "Thu", fullLabel: "Thursday" },
  { key: "fri", label: "Fri", fullLabel: "Friday" },
  { key: "sat", label: "Sat", fullLabel: "Saturday" },
  { key: "sun", label: "Sun", fullLabel: "Sunday" },
] as const;

const tabs = [
  { key: "library", label: "Menus" },
  { key: "edit", label: "Edit" },
  { key: "week", label: "Week board" },
  { key: "pdf", label: "PDF" },
] as const;

type TabKey = (typeof tabs)[number]["key"];
type WeekDayKey = (typeof weekDays)[number]["key"];
type WeekPlan = Record<WeekDayKey, string | null>;
type SaveState = "idle" | "saving" | "saved" | "error";
type SavedLoadState = "idle" | "loading" | "loaded" | "error";

type PreviewItem = {
  id: string;
  meal: MealKey;
  name: string;
  grams: number;
  nutrition: NutritionFactsDto;
};

type PreviewModel = {
  title: string;
  subtitle: string;
  items: PreviewItem[];
  totals: MenuTotalsDto;
};

const WEEK_PLAN_STORAGE_KEY = "labellens.weekPlan.v1";

function formatMacro(value: number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)}${suffix}`;
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

function draftToPreviewItems(items: MenuDraftItem[]): PreviewItem[] {
  return items.map((item) => ({
    id: item.id,
    meal: item.meal,
    name: item.food.name,
    grams: item.grams,
    nutrition: item.food.nutrition,
  }));
}

function savedToPreviewItems(menu: SavedMenuDto): PreviewItem[] {
  return menu.meals.flatMap((meal) =>
    meal.items.map((item) => ({
      id: `${menu.id}-${meal.type}-${item.id}`,
      meal: meal.type,
      name: item.displayName,
      grams: item.grams,
      nutrition: item.nutrition,
    })),
  );
}

function itemsByMeal(items: PreviewItem[], meal: MealKey): PreviewItem[] {
  return items.filter((item) => item.meal === meal);
}

function menuMealItems(menu: SavedMenuDto | null | undefined, meal: MealKey): PreviewItem[] {
  return menu ? itemsByMeal(savedToPreviewItems(menu), meal) : [];
}

function countSavedMenuItems(menu: SavedMenuDto): number {
  return menu.meals.reduce((total, meal) => total + meal.items.length, 0);
}

function estimatedKcalForItem(item: PreviewItem): string {
  const kcal = calculateMacro(item.nutrition.energyKcalPer100g, item.grams);
  return formatMacro(kcal, " kcal");
}

function emptyTotals(): MenuTotalsDto {
  return {
    energyKcal: null,
    proteinG: null,
    carbsG: null,
    fatG: null,
    sugarG: null,
    fiberG: null,
    sodiumMg: null,
    partialData: true,
  };
}

function calculatePreviewTotals(items: PreviewItem[]): MenuTotalsDto {
  const energyKcal = sumNullable(items.map((item) => calculateMacro(item.nutrition.energyKcalPer100g, item.grams)));
  const proteinG = sumNullable(items.map((item) => calculateMacro(item.nutrition.proteinGPer100g, item.grams)));
  const carbsG = sumNullable(items.map((item) => calculateMacro(item.nutrition.carbsGPer100g, item.grams)));
  const fatG = sumNullable(items.map((item) => calculateMacro(item.nutrition.fatGPer100g, item.grams)));

  return {
    energyKcal,
    proteinG,
    carbsG,
    fatG,
    sugarG: sumNullable(items.map((item) => calculateMacro(item.nutrition.sugarGPer100g, item.grams))),
    fiberG: sumNullable(items.map((item) => calculateMacro(item.nutrition.fiberGPer100g, item.grams))),
    sodiumMg: sumNullable(items.map((item) => calculateMacro(item.nutrition.sodiumMgPer100g, item.grams))),
    partialData:
      items.some((item) => item.nutrition.completeness !== "COMPLETE") ||
      [energyKcal, proteinG, carbsG, fatG].some((value) => value === null),
  };
}

function emptyWeekPlan(): WeekPlan {
  return weekDays.reduce((plan, day) => ({ ...plan, [day.key]: null }), {} as WeekPlan);
}

function readWeekPlan(): WeekPlan {
  if (typeof window === "undefined") {
    return emptyWeekPlan();
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(WEEK_PLAN_STORAGE_KEY) ?? "null") as Partial<WeekPlan> | null;
    return weekDays.reduce(
      (plan, day) => ({
        ...plan,
        [day.key]: typeof parsed?.[day.key] === "string" ? parsed[day.key] : null,
      }),
      {} as WeekPlan,
    );
  } catch {
    return emptyWeekPlan();
  }
}

function writeWeekPlan(plan: WeekPlan) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(WEEK_PLAN_STORAGE_KEY, JSON.stringify(plan));
}

function FeedbackMessage({ tone, children }: { tone: "success" | "error" | "info"; children: ReactNode }) {
  const toneClass = {
    success: "border-[#c9e9b5] bg-[#edfbdc] text-[#0b6b47]",
    error: "border-[#f0d2c7] bg-[#fff0ea] text-[#9b392f]",
    info: "border-[#f0d7ad] bg-[#fff8ea] text-[#5d665d]",
  }[tone];

  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm font-bold ${toneClass}`}>
      {children}
    </p>
  );
}

function TabButton({ tab, activeTab, onSelect }: { tab: (typeof tabs)[number]; activeTab: TabKey; onSelect: (tab: TabKey) => void }) {
  const isActive = activeTab === tab.key;

  return (
    <button
      id={`menus-tab-${tab.key}`}
      role="tab"
      type="button"
      aria-selected={isActive}
      aria-controls={`menus-panel-${tab.key}`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => onSelect(tab.key)}
      className={`min-h-11 shrink-0 rounded-2xl px-4 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb84d] ${
        isActive
          ? "bg-[#0b7a53] text-white shadow-[0_12px_24px_rgba(11,122,83,0.2)]"
          : "bg-[#fff8ea] text-[#304135] ring-1 ring-[#f0d7ad] hover:bg-[#ffefc2]"
      }`}
    >
      {tab.label}
    </button>
  );
}

function MenuDocumentPreview({ title, subtitle, items, totals }: PreviewModel) {
  const mealsWithFoods = mealOptions
    .map((meal) => ({ meal, items: itemsByMeal(items, meal.key) }))
    .filter((section) => section.items.length > 0);

  return (
    <article className="ll-export-preview rounded-[2rem] border border-[#e8c98f] bg-[#fffaf0] p-5 shadow-[0_18px_45px_rgba(88,61,24,0.11)] md:p-7">
      <div className="grid gap-4 border-b border-[#eed8ac] pb-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#0b7a53]">Menu summary</p>
          <h2 className="mt-1 text-3xl font-black leading-tight text-[#18261e]">{title}</h2>
          <p className="mt-1 text-sm font-bold text-[#6b756c]">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-[#20281f] px-5 py-4 text-right text-[#fff8ea] sm:min-w-[7rem]">
          <p className="text-2xl font-black">{formatMacro(totals.energyKcal)}</p>
          <p className="text-xs font-bold text-[#efe3ca]">kcal</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <MacroTile value={formatMacro(totals.proteinG, "g")} label="Protein" tone="leaf" />
        <MacroTile value={formatMacro(totals.carbsG, "g")} label="Carbs" tone="berry" />
        <MacroTile value={formatMacro(totals.fatG, "g")} label="Fat" tone="peach" />
      </div>

      <PartialDataNotice
        show={totals.partialData && items.length > 0}
        label="Some totals are partial because a food is missing values."
      />

      {mealsWithFoods.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-[#efd8b7] bg-[#fff8ea] px-4 py-5 text-sm font-bold text-[#8a7553]">
          No foods in this menu yet.
        </p>
      ) : (
        <div className="mt-6 divide-y divide-[#efd8b7] border-y border-[#efd8b7]">
          {mealsWithFoods.map((section) => (
            <section key={section.meal.key} className="py-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#344538]">
                  <span aria-hidden="true">{mealIcons[section.meal.key]}</span>
                  {section.meal.label}
                </h3>
                <span className="text-xs font-black text-[#8a7553]">
                  {section.items.length} {section.items.length === 1 ? "food" : "foods"}
                </span>
              </div>

              <div className="divide-y divide-[#ead6b4]">
                {section.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 py-3 text-sm">
                    <p className="min-w-0 font-black text-[#18261e]">{item.name}</p>
                    <p className="font-bold text-[#6b756c]">{item.grams} g</p>
                    <p className="font-black text-[#0b6b47]">{estimatedKcalForItem(item)}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </article>
  );
}

function SavedMenuCard({
  menu,
  isSelected,
  isEditing,
  onView,
  onEdit,
  onDelete,
}: {
  menu: SavedMenuDto;
  isSelected: boolean;
  isEditing: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className={`rounded-3xl border p-4 ${isSelected || isEditing ? "border-[#0b7a53] bg-[#f0fbdc]" : "border-[#efd8b7] bg-[#fff4d9]"}`}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <h3 className="ll-line-clamp-2 text-lg font-black text-[#18261e]">{menu.name}</h3>
          <p className="mt-1 text-xs font-bold text-[#6b756c]">
            {countSavedMenuItems(menu)} foods · updated {new Date(menu.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <span className="w-fit rounded-full bg-[#20281f] px-3 py-1 text-xs font-black text-[#fff8ea]">
          {formatMacro(menu.totals.energyKcal, " kcal")}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button type="button" onClick={onView} className="ll-interactive min-h-11 rounded-2xl bg-[#0b7a53] px-3 text-sm font-black text-white hover:bg-[#075f41] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]">
          View
        </button>
        <button type="button" onClick={onEdit} className="ll-interactive min-h-11 rounded-2xl bg-[#fff8ea] px-3 text-sm font-black text-[#18261e] ring-1 ring-[#f0d7ad] hover:bg-[#ffefc2] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]">
          Edit
        </button>
        <button type="button" onClick={onDelete} className="ll-interactive min-h-11 rounded-2xl bg-[#fff0ea] px-3 text-sm font-black text-[#9b392f] ring-1 ring-[#f0d2c7] hover:bg-[#ffe0d6] focus:outline-none focus:ring-2 focus:ring-[#ffb8a8]">
          Delete
        </button>
      </div>
    </article>
  );
}

function StartMenuCard() {
  return (
    <div className="rounded-[2rem] border border-[#f0d7ad] bg-[#fff8ea] p-5 shadow-[0_18px_45px_rgba(88,61,24,0.10)]">
      <p className="text-xs font-black uppercase tracking-wide text-[#0b7a53]">Build a menu</p>
      <h2 className="mt-1 text-2xl font-black text-[#18261e]">Start from foods or labels.</h2>
      <p className="mt-2 text-sm leading-6 text-[#5d665d]">
        Add foods by grams first. Then come back to name the menu, save it, and place it in your week.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link href="/search" className="ll-interactive flex min-h-12 items-center justify-center rounded-2xl bg-[#0b7a53] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(11,122,83,0.2)] hover:bg-[#075f41] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]">
          Search foods
        </Link>
        <Link href="/scan" className="ll-interactive flex min-h-12 items-center justify-center rounded-2xl bg-[#ffe7ad] px-4 text-sm font-black text-[#18261e] ring-1 ring-[#f0d7ad] hover:bg-[#ffd98a] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]">
          Scan product
        </Link>
      </div>
    </div>
  );
}

function LibraryTab({
  savedMenus,
  savedLoadState,
  savedError,
  isAuthenticated,
  userName,
  selectedMenuId,
  editingMenuId,
  selectedPreview,
  onLogin,
  onView,
  onEdit,
  onDelete,
}: {
  savedMenus: SavedMenuDto[];
  savedLoadState: SavedLoadState;
  savedError: string | null;
  isAuthenticated: boolean;
  userName?: string;
  selectedMenuId: string | null;
  editingMenuId: string | null;
  selectedPreview: PreviewModel | null;
  onLogin: () => void;
  onView: (menu: SavedMenuDto) => void;
  onEdit: (menu: SavedMenuDto) => void;
  onDelete: (menu: SavedMenuDto) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        {selectedPreview ? <MenuDocumentPreview {...selectedPreview} /> : <StartMenuCard />}
      </div>
      <aside className="space-y-4">
        <div className="rounded-[2rem] border border-[#f0d7ad] bg-[#fff8ea] p-5 shadow-[0_18px_45px_rgba(88,61,24,0.10)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#0b7a53]">Library</p>
              <h2 className="mt-1 text-2xl font-black text-[#18261e]">Saved menus</h2>
            </div>
            {isAuthenticated && userName ? (
              <span className="rounded-full bg-[#edfbdc] px-3 py-2 text-xs font-black text-[#0b6b47] ring-1 ring-[#c9e9b5]">
                {userName}
              </span>
            ) : null}
          </div>

          {!isAuthenticated ? (
            <div className="mt-4 rounded-3xl border border-[#d8e7bd] bg-[#f0fbdc] p-4">
              <p className="text-sm font-bold leading-6 text-[#465246]">Log in to keep more than one menu and plan your week.</p>
              <button type="button" onClick={onLogin} className="ll-interactive mt-3 min-h-11 w-full rounded-2xl bg-[#0b7a53] px-4 text-sm font-black text-white hover:bg-[#075f41] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]">
                Login or register
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {savedLoadState === "loading" ? <FeedbackMessage tone="info">Loading saved menus...</FeedbackMessage> : null}
              {savedLoadState === "error" ? <FeedbackMessage tone="error">{savedError ?? "Could not load saved menus."}</FeedbackMessage> : null}
              {savedLoadState !== "loading" && savedMenus.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#efd8b7] bg-[#f5ecd8] p-3 text-sm font-bold text-[#8a7553]">No saved menus yet.</p>
              ) : null}

              {savedMenus.map((menu) => (
                <SavedMenuCard
                  key={menu.id}
                  menu={menu}
                  isSelected={selectedMenuId === menu.id}
                  isEditing={editingMenuId === menu.id}
                  onView={() => onView(menu)}
                  onEdit={() => onEdit(menu)}
                  onDelete={() => onDelete(menu)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function EditTab({
  hasDraft,
  draftName,
  isEditingSavedMenu,
  menuItems,
  menuTotals,
  saveState,
  onDraftNameChange,
  onSave,
  onClear,
  onCancelEdit,
}: {
  hasDraft: boolean;
  draftName: string;
  isEditingSavedMenu: boolean;
  menuItems: MenuDraftItem[];
  menuTotals: MenuTotalsDto;
  saveState: SaveState;
  onDraftNameChange: (name: string) => void;
  onSave: () => void;
  onClear: () => void;
  onCancelEdit?: () => void;
}) {
  if (!hasDraft) {
    return <StartMenuCard />;
  }

  const preview: PreviewModel = {
    title: draftName.trim() || "Unnamed menu",
    subtitle: `${menuItems.length} ${menuItems.length === 1 ? "food" : "foods"}`,
    items: draftToPreviewItems(menuItems),
    totals: menuTotals,
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section className="ll-print-hide rounded-[2rem] border border-[#f0d7ad] bg-[#fff8ea] p-5 shadow-[0_18px_45px_rgba(88,61,24,0.10)]">
        <p className="text-xs font-black uppercase tracking-wide text-[#0b7a53]">{isEditingSavedMenu ? "Edit saved menu" : "New menu"}</p>
        <h2 className="mt-1 text-2xl font-black text-[#18261e]">Name and save</h2>
        <p className="mt-2 text-sm leading-6 text-[#5d665d]">
          Name it here. Use Add foods or Scan product only when you want to change what is inside.
        </p>

        <label className="mt-5 grid gap-2 text-xs font-black text-[#465246]">
          Menu name
          <input
            value={draftName}
            onChange={(event) => onDraftNameChange(event.target.value)}
            minLength={2}
            maxLength={80}
            placeholder="Example: High protein Monday"
            className="min-h-12 rounded-2xl border border-[#f0d7ad] bg-[#fff4df] px-4 text-sm font-black text-[#18261e] outline-none focus:border-[#0b7a53] focus:ring-2 focus:ring-[#c9f0a0]"
          />
        </label>

        <div className="mt-4 grid gap-2">
          <button type="button" onClick={onSave} disabled={saveState === "saving"} className="ll-interactive min-h-12 rounded-2xl bg-[#0b7a53] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(11,122,83,0.22)] hover:bg-[#075f41] focus:outline-none focus:ring-2 focus:ring-[#ffb84d] disabled:opacity-60">
            {saveState === "saving" ? "Saving..." : isEditingSavedMenu ? "Update menu" : "Save menu"}
          </button>
          <button type="button" onClick={isEditingSavedMenu && onCancelEdit ? onCancelEdit : onClear} className="ll-interactive min-h-12 rounded-2xl bg-[#20281f] px-5 text-sm font-black text-white hover:bg-[#111811] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]">
            {isEditingSavedMenu ? "Cancel edit" : "Clear menu"}
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
          <Link href="/search" className="ll-interactive flex min-h-11 items-center justify-center rounded-2xl bg-[#fff8ea] px-4 text-sm font-black text-[#18261e] ring-1 ring-[#f0d7ad] hover:bg-[#ffefc2] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]">
            Add foods
          </Link>
          <Link href="/scan" className="ll-interactive flex min-h-11 items-center justify-center rounded-2xl bg-[#ffe7ad] px-4 text-sm font-black text-[#18261e] ring-1 ring-[#f0d7ad] hover:bg-[#ffd98a] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]">
            Scan product
          </Link>
        </div>
      </section>

      <MenuDocumentPreview {...preview} />
    </div>
  );
}

function WeekPlannerBoard({
  savedMenus,
  weekPlan,
  onChange,
}: {
  savedMenus: SavedMenuDto[];
  weekPlan: WeekPlan;
  onChange: (day: WeekDayKey, menuId: string) => void;
}) {
  const menuById = new Map(savedMenus.map((menu) => [menu.id, menu]));

  return (
    <section className="rounded-[2rem] border border-[#f0d7ad] bg-[#fff1d1] p-4 shadow-[0_18px_45px_rgba(88,61,24,0.08)] md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#0b7a53]">Week board</p>
          <h2 className="mt-1 text-2xl font-black text-[#18261e]">Plan meals by day</h2>
          <p className="mt-1 text-sm leading-6 text-[#5d665d]">Choose the saved menu you want to prep for each day. Meals fill the board automatically.</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-3xl border border-[#e8c98f] bg-[#fff8ea]">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#ffe7ad] text-[#18261e]">
              <th className="w-32 border-b border-r border-[#e8c98f] p-3 text-xs font-black uppercase tracking-wide">Meal</th>
              {weekDays.map((day) => (
                <th key={day.key} className="border-b border-r border-[#e8c98f] p-3 align-top last:border-r-0">
                  <span className="block text-sm font-black">{day.fullLabel}</span>
                  <select
                    value={weekPlan[day.key] ?? ""}
                    onChange={(event) => onChange(day.key, event.target.value)}
                    disabled={savedMenus.length === 0}
                    className="mt-2 min-h-10 w-full rounded-xl border border-[#f0d7ad] bg-[#fff4df] px-2 text-xs font-black text-[#18261e] outline-none focus:border-[#0b7a53] focus:ring-2 focus:ring-[#c9f0a0] disabled:opacity-60"
                  >
                    <option value="">No menu</option>
                    {savedMenus.map((menu) => (
                      <option key={menu.id} value={menu.id}>{menu.name}</option>
                    ))}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mealOptions.map((meal) => (
              <tr key={meal.key}>
                <th className="border-r border-t border-[#e8c98f] bg-[#fff4d9] p-3 text-xs font-black uppercase tracking-wide text-[#344538]">
                  <span aria-hidden="true" className="mr-1">{mealIcons[meal.key]}</span>
                  {meal.label}
                </th>
                {weekDays.map((day) => {
                  const menu = menuById.get(weekPlan[day.key] ?? "");
                  const foods = menuMealItems(menu, meal.key);
                  return (
                    <td key={`${day.key}-${meal.key}`} className="h-28 border-r border-t border-[#e8c98f] p-3 align-top last:border-r-0">
                      {foods.length === 0 ? (
                        <span className="text-xs font-bold text-[#9a855f]">—</span>
                      ) : (
                        <ul className="space-y-1">
                          {foods.map((food) => (
                            <li key={food.id} className="text-xs font-bold leading-5 text-[#18261e]">
                              {food.name} <span className="text-[#6b756c]">{food.grams}g</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WeeklyPrintPreview({ savedMenus, weekPlan }: { savedMenus: SavedMenuDto[]; weekPlan: WeekPlan }) {
  const menuById = new Map(savedMenus.map((menu) => [menu.id, menu]));

  return (
    <section className="ll-print-area ll-weekly-print rounded-[2rem] border border-[#f0d7ad] bg-[#fffaf0] p-5 shadow-[0_18px_45px_rgba(88,61,24,0.10)]">
      <div className="mb-5 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0b7a53]">LabelLens</p>
        <h2 className="mt-1 text-3xl font-black text-[#18261e]">Weekly meal sheet</h2>
        <p className="mt-1 text-sm font-bold text-[#6b756c]">Monday to Sunday · meals by day</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              <th className="w-32 border border-[#d9c29a] bg-[#fff4d9] p-3 text-xs font-black uppercase tracking-wide">Meal</th>
              {weekDays.map((day) => {
                const menu = menuById.get(weekPlan[day.key] ?? "");
                return (
                  <th key={day.key} className="border border-[#d9c29a] bg-[#fff4d9] p-3 align-top">
                    <span className="block text-sm font-black uppercase tracking-wide text-[#18261e]">{day.label}</span>
                    <span className="mt-1 block text-[0.7rem] font-bold text-[#6b756c]">{menu?.name ?? "No menu"}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {mealOptions.map((meal) => (
              <tr key={meal.key}>
                <th className="border border-[#d9c29a] bg-[#fffaf0] p-3 text-xs font-black uppercase tracking-wide text-[#344538]">{meal.label}</th>
                {weekDays.map((day) => {
                  const menu = menuById.get(weekPlan[day.key] ?? "");
                  const foods = menuMealItems(menu, meal.key);
                  return (
                    <td key={`${day.key}-${meal.key}`} className="h-32 border border-[#d9c29a] p-3 align-top">
                      {foods.length === 0 ? (
                        <span className="text-xs text-[#9a855f]">—</span>
                      ) : (
                        <ul className="space-y-1">
                          {foods.map((food) => (
                            <li key={food.id} className="text-xs leading-5 text-[#18261e]">
                              <strong>{food.name}</strong> <span className="text-[#6b756c]">{food.grams}g</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ProfileMenusPanel() {
  const {
    menuItems,
    menuTotals,
    draftName,
    draftDate,
    editingMenuId,
    hasHydratedMenuDraft,
    clearMenu,
    setDraftName,
    replaceDraftWithSavedMenu,
  } = useMenuDraft();
  const { accessToken, hasHydratedAuth, isAuthenticated, user } = useAuthSession();
  const [activeTab, setActiveTab] = useState<TabKey>("library");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [savedMenus, setSavedMenus] = useState<SavedMenuDto[]>([]);
  const [savedLoadState, setSavedLoadState] = useState<SavedLoadState>("idle");
  const [savedError, setSavedError] = useState<string | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [weekPlan, setWeekPlan] = useState<WeekPlan>(emptyWeekPlan);
  const pendingSaveRef = useRef(false);
  const didPickInitialTab = useRef(false);

  const hasDraft = menuItems.length > 0;
  const isEditingSavedMenu = Boolean(editingMenuId);
  const selectedSavedMenu = selectedMenuId ? savedMenus.find((menu) => menu.id === selectedMenuId) ?? null : null;

  const selectedPreview: PreviewModel | null = useMemo(() => {
    if (!selectedSavedMenu) {
      return null;
    }

    return {
      title: selectedSavedMenu.name,
      subtitle: `${countSavedMenuItems(selectedSavedMenu)} ${countSavedMenuItems(selectedSavedMenu) === 1 ? "food" : "foods"}`,
      items: savedToPreviewItems(selectedSavedMenu),
      totals: selectedSavedMenu.totals,
    };
  }, [selectedSavedMenu]);

  useEffect(() => {
    setWeekPlan(readWeekPlan());
  }, []);

  useEffect(() => {
    if (!didPickInitialTab.current && hasHydratedMenuDraft) {
      didPickInitialTab.current = true;
      if (hasDraft) {
        setActiveTab("edit");
      }
    }
  }, [hasDraft, hasHydratedMenuDraft]);

  function cancelWorkingEdit() {
    const canceledMenuId = editingMenuId;
    clearMenu();
    setSelectedMenuId(canceledMenuId);
    setFeedback({ tone: "info", message: "Edit canceled. The saved menu was not changed." });
  }

  function changeTab(tab: TabKey) {
    if (tab !== "edit" && editingMenuId) {
      cancelWorkingEdit();
    }

    setActiveTab(tab);
  }

  function updateWeekPlan(day: WeekDayKey, menuId: string) {
    setWeekPlan((currentPlan) => {
      const nextPlan = { ...currentPlan, [day]: menuId || null };
      writeWeekPlan(nextPlan);
      return nextPlan;
    });
  }

  async function refreshSavedMenus(token = accessToken) {
    if (!token) {
      setSavedMenus([]);
      setSavedLoadState("idle");
      return;
    }

    setSavedLoadState("loading");
    setSavedError(null);

    try {
      const result = await listSavedMenus(token);
      setSavedMenus(result.items);
      setSavedLoadState("loaded");
    } catch (error) {
      setSavedLoadState("error");
      setSavedError(error instanceof Error ? error.message : "Could not load saved menus.");
    }
  }

  useEffect(() => {
    if (!hasHydratedAuth) {
      return;
    }

    void refreshSavedMenus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydratedAuth, accessToken]);

  async function saveCurrentMenu(tokenOverride?: string) {
    if (!hasDraft || saveState === "saving") {
      return;
    }

    const normalizedName = draftName.trim();

    if (normalizedName.length < 2) {
      setSaveState("error");
      setFeedback({ tone: "error", message: "Give this menu a clear name before saving." });
      setActiveTab("edit");
      return;
    }

    const token = tokenOverride ?? accessToken;

    if (!token) {
      pendingSaveRef.current = true;
      setIsAuthModalOpen(true);
      return;
    }

    setSaveState("saving");
    setFeedback(null);

    try {
      const payload = buildSaveMenuPayload(menuItems, { name: normalizedName, date: draftDate });
      const result = editingMenuId
        ? await updateSavedMenu(token, editingMenuId, payload)
        : await saveMenuDraft(token, payload);

      pendingSaveRef.current = false;
      setSaveState("saved");
      setSavedMenus((currentMenus) => {
        const alreadySaved = currentMenus.some((menu) => menu.id === result.menu.id);
        return alreadySaved
          ? currentMenus.map((menu) => (menu.id === result.menu.id ? result.menu : menu))
          : [result.menu, ...currentMenus];
      });
      clearMenu();
      setSelectedMenuId(result.menu.id);
      setActiveTab("library");
      await refreshSavedMenus(token);
      setFeedback({ tone: "success", message: editingMenuId ? `${result.menu.name} updated.` : `${result.menu.name} saved.` });
    } catch (error) {
      setSaveState("error");
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Menu save failed." });
    }
  }

  async function onAuthenticated(session: AuthSession) {
    setFeedback({ tone: "success", message: `Welcome, ${session.user.displayName}.` });
    await refreshSavedMenus(session.accessToken);

    if (pendingSaveRef.current) {
      await saveCurrentMenu(session.accessToken);
    }
  }

  async function deleteMenu(menu: SavedMenuDto) {
    if (!accessToken) {
      setIsAuthModalOpen(true);
      return;
    }

    setFeedback(null);

    try {
      await deleteSavedMenu(accessToken, menu.id);
      setSavedMenus((currentMenus) => currentMenus.filter((item) => item.id !== menu.id));
      if (selectedMenuId === menu.id) {
        setSelectedMenuId(null);
      }
      setWeekPlan((currentPlan) => {
        const nextPlan = weekDays.reduce((plan, day) => ({
          ...plan,
          [day.key]: currentPlan[day.key] === menu.id ? null : currentPlan[day.key],
        }), {} as WeekPlan);
        writeWeekPlan(nextPlan);
        return nextPlan;
      });
      setFeedback({ tone: "success", message: `${menu.name} deleted.` });
    } catch (error) {
      setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Could not delete menu." });
    }
  }

  function editSavedMenu(menu: SavedMenuDto) {
    replaceDraftWithSavedMenu(menu);
    setSelectedMenuId(null);
    setActiveTab("edit");
    setFeedback({ tone: "success", message: `${menu.name} is open for editing. Update will replace this saved menu.` });
  }

  function viewSavedMenu(menu: SavedMenuDto) {
    if (editingMenuId) {
      clearMenu();
    }

    setSelectedMenuId(menu.id);
    setActiveTab("library");
  }

  function printWeeklyPlan() {
    window.print();
  }

  if (!hasHydratedMenuDraft || !hasHydratedAuth) {
    return (
      <div className="rounded-[2rem] border border-[#f0d7ad] bg-[#fff8ea] p-6 text-sm font-bold text-[#5d665d] shadow-sm">Loading...</div>
    );
  }

  return (
    <>
      <section className="space-y-5 pb-28 md:pb-10">
        <div className="ll-print-hide rounded-[2rem] border border-[#f0d7ad] bg-[#fff1d1] p-5 shadow-[0_18px_45px_rgba(88,61,24,0.10)] md:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#0b7a53]">My menus</p>
              <h1 className="mt-1 text-3xl font-black leading-tight text-[#18261e] sm:text-4xl">Save menus and plan your week.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5d665d]">Use tabs for saved menus, editing, week planning, and PDF export.</p>
            </div>
            <div role="tablist" aria-label="Menu workspace" className="flex gap-2 overflow-x-auto rounded-[1.35rem] border border-[#f0d7ad] bg-[#fff8ea] p-2">
              {tabs.map((tab) => <TabButton key={tab.key} tab={tab} activeTab={activeTab} onSelect={changeTab} />)}
            </div>
          </div>
          {feedback ? (
            <div className="mt-4"><FeedbackMessage tone={feedback.tone}>{feedback.message}</FeedbackMessage></div>
          ) : null}
        </div>

        <div id="menus-panel-library" role="tabpanel" aria-labelledby="menus-tab-library" hidden={activeTab !== "library"}>
          <LibraryTab
            savedMenus={savedMenus}
            savedLoadState={savedLoadState}
            savedError={savedError}
            isAuthenticated={isAuthenticated}
            userName={user?.displayName}
            selectedMenuId={selectedMenuId}
            editingMenuId={editingMenuId}
            selectedPreview={selectedPreview}
            onLogin={() => setIsAuthModalOpen(true)}
            onView={viewSavedMenu}
            onEdit={editSavedMenu}
            onDelete={(menu) => void deleteMenu(menu)}
          />
        </div>

        <div id="menus-panel-edit" role="tabpanel" aria-labelledby="menus-tab-edit" hidden={activeTab !== "edit"}>
          <EditTab
            hasDraft={hasDraft}
            draftName={draftName}
            isEditingSavedMenu={isEditingSavedMenu}
            menuItems={menuItems}
            menuTotals={menuTotals}
            saveState={saveState}
            onDraftNameChange={setDraftName}
            onSave={() => void saveCurrentMenu()}
            onClear={clearMenu}
            onCancelEdit={cancelWorkingEdit}
          />
        </div>

        <div id="menus-panel-week" role="tabpanel" aria-labelledby="menus-tab-week" hidden={activeTab !== "week"}>
          <WeekPlannerBoard savedMenus={savedMenus} weekPlan={weekPlan} onChange={updateWeekPlan} />
        </div>

        <div id="menus-panel-pdf" role="tabpanel" aria-labelledby="menus-tab-pdf" hidden={activeTab !== "pdf"}>
          <div className="ll-print-hide mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-[#f0d7ad] bg-[#fff8ea] p-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#0b7a53]">PDF export</p>
              <h2 className="text-2xl font-black text-[#18261e]">Weekly menu sheet</h2>
              <p className="mt-1 text-sm leading-6 text-[#5d665d]">Print a landscape weekly board: days across, meals down.</p>
            </div>
            <button type="button" onClick={printWeeklyPlan} className="ll-interactive min-h-12 rounded-2xl bg-[#0b7a53] px-6 text-sm font-black text-white shadow-[0_12px_28px_rgba(11,122,83,0.22)] hover:bg-[#075f41] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]">
              Print / PDF
            </button>
          </div>
          <WeeklyPrintPreview savedMenus={savedMenus} weekPlan={weekPlan} />
        </div>
      </section>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={(session) => void onAuthenticated(session)}
        title="Save your menu"
        description="Login or register to save menus and plan your week."
      />
    </>
  );
}
