"use client";

import { useEffect, useState } from "react";
import { type FoodItemDto } from "@/shared/api/foods-api";
import { MacroTile } from "@/shared/ui/MacroTile";
import { type MealKey, mealOptions } from "../hooks/useFoodSearch";

type FoodResultCardProps = {
  food: FoodItemDto;
  defaultMeal: MealKey;
  onAddToMenu: (food: FoodItemDto, meal: MealKey) => void;
};

function formatGrams(value: number | null): string {
  return value === null ? "—" : `${value}g`;
}

function formatKcal(value: number | null): string | number {
  return value === null ? "—" : value;
}

export function FoodResultCard({
  food,
  defaultMeal,
  onAddToMenu,
}: FoodResultCardProps) {
  const [meal, setMeal] = useState<MealKey>(defaultMeal);

  useEffect(() => {
    setMeal(defaultMeal);
  }, [defaultMeal]);

  return (
    <article className="ll-card ll-row-in rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px_300px] xl:items-center">
        <div className="min-w-0">
          <h3 className="text-lg font-black leading-tight text-slate-950">
            {food.name}
          </h3>

          <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs font-medium text-slate-500">
            <span>Nutrition per 100 g</span>
            <span>·</span>
            <span>{food.nutrition.completeness.toLowerCase()}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <MacroTile value={formatKcal(food.nutrition.energyKcalPer100g)} label="kcal" />
          <MacroTile value={formatGrams(food.nutrition.proteinGPer100g)} label="Protein" />
          <MacroTile value={formatGrams(food.nutrition.carbsGPer100g)} label="Carbs" />
          <MacroTile value={formatGrams(food.nutrition.fatGPer100g)} label="Fat" />
        </div>

        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_130px]">
          <select
            value={meal}
            onChange={(event) => setMeal(event.target.value as MealKey)}
            aria-label={`Meal for ${food.name}`}
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none hover:border-emerald-300 hover:bg-white focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          >
            {mealOptions.map((mealOption) => (
              <option key={mealOption.key} value={mealOption.key}>
                {mealOption.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onAddToMenu(food, meal)}
            className="ll-interactive min-h-12 w-full rounded-2xl bg-emerald-700 px-4 text-sm font-black text-white shadow-sm hover:bg-emerald-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            Add 100 g
          </button>
        </div>
      </div>
    </article>
  );
}
