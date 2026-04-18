"use client";

import { useMemo, useState } from "react";
import { type FoodItemDto } from "@/shared/api/foods-api";
import { MacroTile } from "@/shared/ui/MacroTile";

function calculate(valuePer100g: number | null | undefined, grams: number): number | null {
  if (valuePer100g === null || valuePer100g === undefined) {
    return null;
  }

  return Number(((valuePer100g * grams) / 100).toFixed(2));
}

function format(value: number | null, suffix = ""): string {
  return value === null ? "—" : `${value}${suffix}`;
}

function parseGrams(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 40;
  }

  return Math.max(1, Math.min(10000, Math.round(parsed)));
}

export function FoodDetailCalculator({ food }: { food: FoodItemDto }) {
  const [grams, setGrams] = useState(40);

  const macros = useMemo(() => ({
    energyKcal: calculate(food.nutrition.energyKcalPer100g, grams),
    proteinG: calculate(food.nutrition.proteinGPer100g, grams),
    carbsG: calculate(food.nutrition.carbsGPer100g, grams),
    fatG: calculate(food.nutrition.fatGPer100g, grams),
    sugarG: calculate(food.nutrition.sugarGPer100g, grams),
    fiberG: calculate(food.nutrition.fiberGPer100g, grams),
    sodiumMg: calculate(food.nutrition.sodiumMgPer100g, grams),
  }), [food.nutrition, grams]);

  return (
    <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Gram calculator
          </p>
          <h2 className="mt-1 text-2xl font-black leading-tight">Preview by grams</h2>
        </div>

        <label className="grid gap-1 text-xs font-black text-slate-600 sm:w-40">
          Grams
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={10000}
            value={grams}
            onChange={(event) => setGrams(parseGrams(event.target.value))}
            className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-base font-black outline-none hover:border-emerald-300 hover:bg-white focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <MacroTile value={format(macros.energyKcal)} label="kcal" />
        <MacroTile value={format(macros.proteinG, "g")} label="Protein" />
        <MacroTile value={format(macros.carbsG, "g")} label="Carbs" />
        <MacroTile value={format(macros.fatG, "g")} label="Fat" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MacroTile value={format(macros.sugarG, "g")} label="Sugar" />
        <MacroTile value={format(macros.fiberG, "g")} label="Fiber" />
        <MacroTile value={format(macros.sodiumMg, "mg")} label="Sodium" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[40, 100, 180].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setGrams(value)}
            className="ll-interactive min-h-11 rounded-2xl bg-slate-50 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-white hover:ring-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            {value} g
          </button>
        ))}
      </div>
    </section>
  );
}
