"use client";

import { useEffect, useMemo, useState } from "react";
import { type FoodItemDto } from "@/shared/api/foods-api";
import { MacroTile } from "@/shared/ui/MacroTile";
import { PartialDataNotice } from "@/shared/ui/PartialDataNotice";
import { type MealKey, mealOptions } from "../hooks/useFoodSearch";
import { FoodNutritionModal } from "./FoodNutritionModal";

type FoodResultCardProps = {
  food: FoodItemDto;
  defaultMeal: MealKey;
  onAddToMenu: (food: FoodItemDto, meal: MealKey, grams: number) => void;
};

type MacroPreview = {
  label: string;
  value: string;
  tone: "leaf" | "sun" | "berry" | "peach";
};

function formatMacro(value: number | null | undefined, unit: "g" | "kcal"): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return unit === "kcal" ? String(value) : `${value}g`;
}

function calculate(valuePer100g: number | null | undefined, grams: number): number | null {
  if (valuePer100g === null || valuePer100g === undefined) {
    return null;
  }

  return Number(((valuePer100g * grams) / 100).toFixed(2));
}

function parseGramsInput(value: string): number | null {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.min(10000, Math.round(parsed));
}

export function FoodResultCard({
  food,
  defaultMeal,
  onAddToMenu,
}: FoodResultCardProps) {
  const [meal, setMeal] = useState<MealKey>(defaultMeal);
  const [gramsInput, setGramsInput] = useState("40");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const grams = parseGramsInput(gramsInput);
  const previewGrams = grams ?? 40;
  const canAdd = grams !== null;
  const mealLabel = mealOptions.find((option) => option.key === meal)?.label ?? "meal";

  const macroPreview = useMemo<MacroPreview[]>(() => ([
    {
      label: "kcal",
      value: formatMacro(calculate(food.nutrition.energyKcalPer100g, previewGrams), "kcal"),
      tone: "sun",
    },
    {
      label: "Protein",
      value: formatMacro(calculate(food.nutrition.proteinGPer100g, previewGrams), "g"),
      tone: "leaf",
    },
    {
      label: "Carbs",
      value: formatMacro(calculate(food.nutrition.carbsGPer100g, previewGrams), "g"),
      tone: "berry",
    },
    {
      label: "Fat",
      value: formatMacro(calculate(food.nutrition.fatGPer100g, previewGrams), "g"),
      tone: "peach",
    },
  ]), [food.nutrition, previewGrams]);

  useEffect(() => {
    setMeal(defaultMeal);
  }, [defaultMeal]);

  return (
    <article className="ll-row-in rounded-[2rem] border border-[#f0d7ad] bg-[#fff8ea] p-4 shadow-[0_18px_45px_rgba(88,61,24,0.10)] transition-shadow hover:shadow-[0_22px_55px_rgba(88,61,24,0.14)] sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(210px,0.85fr)_minmax(360px,1.35fr)_minmax(300px,0.95fr)] lg:items-center">
        <div className="min-w-0">
          <h3 className="ll-line-clamp-2 text-2xl font-black leading-tight tracking-tight text-[#18261e] sm:text-[1.65rem]">
            {food.name}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-sm font-bold text-[#687468]">
              Preview for <span className="font-black text-[#18261e]">{previewGrams} g</span>
            </p>
            <button
              type="button"
              onClick={() => setIsDetailsOpen(true)}
              className="ll-interactive text-sm font-black text-[#0b6b47] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[#b8e07a]"
            >
              Nutrients &amp; source
            </button>
          </div>

          <div className="mt-3">
            <PartialDataNotice
              show={food.nutrition.completeness !== "COMPLETE"}
              label="Missing nutrients in source data."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
          {macroPreview.map((macro) => (
            <MacroTile key={macro.label} value={macro.value} label={macro.label} tone={macro.tone} />
          ))}
        </div>

        <div className="rounded-[1.5rem] border border-[#d8e7bd] bg-[#f0fbdc] p-3 shadow-inner shadow-[#fff8ea]/80">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#0b7a53]">
            Add to menu
          </p>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px] lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_110px]">
            <label className="grid gap-1 text-xs font-black text-[#465246]">
              Meal
              <select
                value={meal}
                onChange={(event) => setMeal(event.target.value as MealKey)}
                aria-label={`Meal for ${food.name}`}
                className="min-h-12 w-full rounded-2xl border border-[#c9e9b5] bg-[#fff8ea] px-3 text-sm font-bold text-[#18261e] outline-none hover:border-[#89c76d] focus:border-[#0b7a53] focus:ring-2 focus:ring-[#c9f0a0]"
              >
                {mealOptions.map((mealOption) => (
                  <option key={mealOption.key} value={mealOption.key}>
                    {mealOption.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-xs font-black text-[#465246]">
              Grams
              <input
                type="number"
                inputMode="decimal"
                min={1}
                max={10000}
                value={gramsInput}
                onChange={(event) => setGramsInput(event.target.value)}
                aria-label={`Grams for ${food.name}`}
                className="min-h-12 rounded-2xl border border-[#c9e9b5] bg-[#fff8ea] px-3 text-base font-black text-[#18261e] outline-none hover:border-[#89c76d] focus:border-[#0b7a53] focus:ring-2 focus:ring-[#c9f0a0]"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={!canAdd}
            onClick={() => {
              if (grams !== null) {
                onAddToMenu(food, meal, grams);
              }
            }}
            className="ll-interactive mt-3 min-h-12 w-full rounded-2xl bg-[#0b7a53] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(11,122,83,0.24)] hover:bg-[#075f41] hover:shadow-[0_14px_28px_rgba(11,122,83,0.28)] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
          >
            {canAdd ? `Add ${grams} g to ${mealLabel}` : "Enter grams"}
          </button>
        </div>
      </div>

      <FoodNutritionModal
        food={food}
        grams={previewGrams}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </article>
  );
}
