"use client";

import { useMemo, useState } from "react";
import type { FoodItemDto, ProductItemDto } from "@/shared/api/foods-api";
import { MacroTile } from "@/shared/ui/MacroTile";
import { PartialDataNotice } from "@/shared/ui/PartialDataNotice";
import { FoodNutritionModal } from "@/features/food-search/components/FoodNutritionModal";
import { type MealKey, mealOptions } from "@/features/food-search/hooks/useFoodSearch";

type ProductResultCardProps = {
  product: ProductItemDto;
  onAddToMenu: (food: FoodItemDto, meal: MealKey, grams: number) => void;
};

type MacroPreview = {
  label: string;
  value: string;
  tone: "leaf" | "sun" | "berry" | "peach";
};

function calculate(valuePer100g: number | null | undefined, grams: number): number | null {
  if (valuePer100g === null || valuePer100g === undefined) {
    return null;
  }

  return Number(((valuePer100g * grams) / 100).toFixed(2));
}

function formatMacro(value: number | null | undefined, unit: "g" | "kcal"): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return unit === "kcal" ? String(value) : `${value}g`;
}

function parseGrams(value: string): number | null {
  const parsed = Number(value.trim());

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.min(10000, Math.round(parsed));
}

function productToFood(product: ProductItemDto): FoodItemDto {
  return {
    id: `OFF-${product.barcode}`,
    name: product.name,
    brandName: product.brand ?? null,
    dataType: "Packaged product",
    servingSize: 100,
    servingSizeUnit: "g",
    nutrition: product.nutrition,
  };
}

function gradeLabel(value: string | number | null | undefined, fallback: string): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value).toUpperCase();
}

export function ProductResultCard({ product, onAddToMenu }: ProductResultCardProps) {
  const [meal, setMeal] = useState<MealKey>("breakfast");
  const [gramsInput, setGramsInput] = useState("40");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const grams = parseGrams(gramsInput);
  const previewGrams = grams ?? 40;
  const mealLabel = mealOptions.find((option) => option.key === meal)?.label ?? "meal";
  const foodLikeProduct = productToFood(product);

  const macros = useMemo<MacroPreview[]>(() => [
    {
      label: "kcal",
      value: formatMacro(calculate(product.nutrition.energyKcalPer100g, previewGrams), "kcal"),
      tone: "sun",
    },
    {
      label: "Protein",
      value: formatMacro(calculate(product.nutrition.proteinGPer100g, previewGrams), "g"),
      tone: "leaf",
    },
    {
      label: "Carbs",
      value: formatMacro(calculate(product.nutrition.carbsGPer100g, previewGrams), "g"),
      tone: "berry",
    },
    {
      label: "Fat",
      value: formatMacro(calculate(product.nutrition.fatGPer100g, previewGrams), "g"),
      tone: "peach",
    },
  ], [product.nutrition, previewGrams]);

  return (
    <article className="rounded-[2rem] border border-[#f0d7ad] bg-[#fff8ea] p-4 shadow-[0_18px_45px_rgba(88,61,24,0.10)] sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.9fr)_minmax(340px,1.25fr)_minmax(300px,0.95fr)] lg:items-center">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-[#f0d7ad] bg-[#fff4df] text-2xl shadow-sm">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                "🏷️"
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-[#0b7a53]">
                Product found
              </p>
              <h3 className="ll-line-clamp-2 text-2xl font-black leading-tight tracking-tight text-[#18261e]">
                {product.name}
              </h3>
              {product.brand ? (
                <p className="mt-1 text-sm font-bold text-[#687468]">{product.brand}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-sm font-bold text-[#687468]">
              Preview for <span className="font-black text-[#18261e]">{previewGrams} g</span>
            </p>
            <button
              type="button"
              onClick={() => setIsDetailsOpen(true)}
              className="ll-interactive text-sm font-black text-[#0b6b47] underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-[#b8e07a]"
            >
              Nutrition &amp; label
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#dff6c8] px-3 py-1 text-xs font-black text-[#0b7a53]">
              OFF
            </span>
            <span className="rounded-full bg-[#ffe7ad] px-3 py-1 text-xs font-black text-[#6b5430]">
              Nutri {gradeLabel(product.nutriScore, "—")}
            </span>
            <span className="rounded-full bg-[#ffe8d8] px-3 py-1 text-xs font-black text-[#753b22]">
              NOVA {gradeLabel(product.novaGroup, "—")}
            </span>
          </div>

          <div className="mt-3">
            <PartialDataNotice
              show={product.nutrition.completeness !== "COMPLETE"}
              label="Some label nutrients are missing."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
          {macros.map((macro) => (
            <MacroTile key={macro.label} value={macro.value} label={macro.label} tone={macro.tone} />
          ))}
        </div>

        <div className="rounded-[1.5rem] border border-[#d8e7bd] bg-[#f0fbdc] p-3 shadow-inner shadow-[#fff8ea]/80">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#0b7a53]">
            Add to menu
          </p>

          <div className="grid gap-2">
            <label className="grid gap-1 text-xs font-black text-[#465246]">
              Meal
              <select
                value={meal}
                onChange={(event) => setMeal(event.target.value as MealKey)}
                className="min-h-12 w-full rounded-2xl border border-[#c9e9b5] bg-[#fff8ea] px-3 text-sm font-bold text-[#18261e] outline-none hover:border-[#89c76d] focus:border-[#0b7a53] focus:ring-2 focus:ring-[#c9f0a0]"
              >
                {mealOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-xs font-black text-[#465246]">
              Grams
              <input
                value={gramsInput}
                onChange={(event) => setGramsInput(event.target.value)}
                type="number"
                inputMode="numeric"
                min={1}
                max={10000}
                className="min-h-12 rounded-2xl border border-[#c9e9b5] bg-[#fff8ea] px-3 text-lg font-black text-[#18261e] outline-none hover:border-[#89c76d] focus:border-[#0b7a53] focus:ring-2 focus:ring-[#c9f0a0]"
              />
            </label>

            <button
              type="button"
              disabled={grams === null}
              onClick={() => grams !== null && onAddToMenu(foodLikeProduct, meal, grams)}
              className="ll-interactive min-h-12 rounded-2xl bg-[#0b7a53] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(11,122,83,0.22)] hover:bg-[#075f41] focus:outline-none focus:ring-2 focus:ring-[#b8e07a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add {previewGrams} g to {mealLabel}
            </button>
          </div>
        </div>
      </div>

      {product.ingredientsText ? (
        <p className="mt-4 rounded-3xl border border-[#f0d7ad] bg-[#fff4df] p-4 text-sm leading-6 text-[#5d665d]">
          <span className="font-black text-[#18261e]">Ingredients:</span> {product.ingredientsText}
        </p>
      ) : null}

      {product.allergens.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {product.allergens.map((allergen) => (
            <span key={allergen} className="rounded-full bg-[#ffe7ef] px-3 py-1 text-xs font-black text-[#71304a]">
              Contains {allergen}
            </span>
          ))}
        </div>
      ) : null}

      <FoodNutritionModal
        food={foodLikeProduct}
        grams={previewGrams}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </article>
  );
}
