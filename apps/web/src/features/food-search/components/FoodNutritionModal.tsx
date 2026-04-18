"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { type FoodItemDto } from "@/shared/api/foods-api";
import { MacroTile } from "@/shared/ui/MacroTile";
import { PartialDataNotice } from "@/shared/ui/PartialDataNotice";

type FoodNutritionModalProps = {
  food: FoodItemDto;
  grams: number;
  isOpen: boolean;
  onClose: () => void;
};

type NutrientRow = {
  label: string;
  per100g: number | null | undefined;
  unit: "g" | "mg" | "kcal";
};

type MacroPreview = {
  label: string;
  value: string;
  tone: "leaf" | "sun" | "berry" | "peach";
};

const nutrientRows: Array<Omit<NutrientRow, "per100g">> = [
  { label: "Energy", unit: "kcal" },
  { label: "Protein", unit: "g" },
  { label: "Carbs", unit: "g" },
  { label: "Fat", unit: "g" },
  { label: "Sugar", unit: "g" },
  { label: "Fiber", unit: "g" },
  { label: "Sodium", unit: "mg" },
];

function calculate(valuePer100g: number | null | undefined, grams: number): number | null {
  if (valuePer100g === null || valuePer100g === undefined) {
    return null;
  }

  return Number(((valuePer100g * grams) / 100).toFixed(2));
}

function formatValue(value: number | null | undefined, unit: NutrientRow["unit"]): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return unit === "kcal" ? `${value} kcal` : `${value}${unit}`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getRows(food: FoodItemDto): NutrientRow[] {
  const nutrition = food.nutrition;

  return nutrientRows.map((row) => {
    switch (row.label) {
      case "Energy":
        return { ...row, per100g: nutrition.energyKcalPer100g };
      case "Protein":
        return { ...row, per100g: nutrition.proteinGPer100g };
      case "Carbs":
        return { ...row, per100g: nutrition.carbsGPer100g };
      case "Fat":
        return { ...row, per100g: nutrition.fatGPer100g };
      case "Sugar":
        return { ...row, per100g: nutrition.sugarGPer100g };
      case "Fiber":
        return { ...row, per100g: nutrition.fiberGPer100g };
      case "Sodium":
        return { ...row, per100g: nutrition.sodiumMgPer100g };
      default:
        return { ...row, per100g: null };
    }
  });
}

function getMacroPreview(food: FoodItemDto, grams: number): MacroPreview[] {
  const nutrition = food.nutrition;

  return [
    {
      label: "kcal",
      value: formatValue(calculate(nutrition.energyKcalPer100g, grams), "kcal").replace(" kcal", ""),
      tone: "sun",
    },
    {
      label: "Protein",
      value: formatValue(calculate(nutrition.proteinGPer100g, grams), "g"),
      tone: "leaf",
    },
    {
      label: "Carbs",
      value: formatValue(calculate(nutrition.carbsGPer100g, grams), "g"),
      tone: "berry",
    },
    {
      label: "Fat",
      value: formatValue(calculate(nutrition.fatGPer100g, grams), "g"),
      tone: "peach",
    },
  ];
}

export function FoodNutritionModal({
  food,
  grams,
  isOpen,
  onClose,
}: FoodNutritionModalProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements: HTMLElement[] = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

      const firstElement = focusableElements.at(0);
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const nutrition = food.nutrition;
  const rows = getRows(food);
  const macros = getMacroPreview(food, grams);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[100] bg-[#25140b]/55 p-0 text-[#18261e] backdrop-blur-sm sm:p-4"
    >
      <section
        ref={dialogRef}
        className="mx-auto flex h-dvh w-full max-w-2xl flex-col overflow-hidden bg-[#f5ecd8] shadow-2xl shadow-black/20 sm:h-[calc(100dvh-2rem)] sm:rounded-[2rem] sm:border sm:border-[#f0d7ad]"
      >
        <header className="shrink-0 border-b border-[#f0d7ad] bg-[#ffe7ad]/95 px-4 py-4 backdrop-blur sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex rounded-full bg-[#dff6c8] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#0b7a53]">
                Nutrition details
              </p>
              <h2
                id={titleId}
                className="ll-line-clamp-2 mt-3 text-2xl font-black leading-tight tracking-tight text-[#18261e] sm:text-3xl"
              >
                {food.name}
              </h2>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close nutrition details"
              className="ll-interactive flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#f2d59e] bg-[#fff8ea] text-2xl font-black leading-none text-[#243027] shadow-[0_10px_24px_rgba(88,61,24,0.12)] hover:bg-[#ffefc2] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
            >
              ×
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <p className="rounded-3xl border border-[#f0d7ad] bg-[#fff8ea] p-4 text-sm leading-6 text-[#5d665d] shadow-sm">
            Calculated for <span className="font-black text-[#18261e]">{grams} g</span> from per-100 g source values.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {macros.map((macro) => (
              <MacroTile key={macro.label} value={macro.value} label={macro.label} tone={macro.tone} />
            ))}
          </div>

          <div className="mt-4">
            <PartialDataNotice
              show={nutrition.completeness !== "COMPLETE"}
              label="Some nutrients are missing from this source."
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-[1.6rem] border border-[#f0d7ad] bg-[#fff8ea] shadow-[0_14px_35px_rgba(88,61,24,0.08)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-[#ffe7ad] text-left text-xs uppercase tracking-wide text-[#6b5430]">
                  <tr>
                    <th className="px-4 py-3 font-black">Nutrient</th>
                    <th className="px-4 py-3 font-black">Per 100 g</th>
                    <th className="px-4 py-3 font-black">For {grams} g</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5ead3]">
                  {rows.map((row) => (
                    <tr key={row.label} className="odd:bg-[#f5ecd8] even:bg-[#fff4e4]">
                      <td className="px-4 py-3 font-bold text-[#334238]">{row.label}</td>
                      <td className="px-4 py-3 text-[#5d665d]">{formatValue(row.per100g, row.unit)}</td>
                      <td className="px-4 py-3 font-black text-[#18261e]">
                        {formatValue(calculate(row.per100g, grams), row.unit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <dl className="mt-4 grid gap-3 rounded-[1.6rem] border border-[#d8e7bd] bg-[#f0fbdc] p-4 text-sm shadow-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-black uppercase tracking-wide text-[#4e6a35]">Source</dt>
              <dd className="mt-1 font-bold text-[#18261e]">USDA FoodData Central</dd>
            </div>
            <div>
              <dt className="text-xs font-black uppercase tracking-wide text-[#4e6a35]">Fetched</dt>
              <dd className="mt-1 font-bold text-[#18261e]">{formatDate(nutrition.lastFetchedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-black uppercase tracking-wide text-[#4e6a35]">Completeness</dt>
              <dd className="mt-1 font-bold text-[#18261e]">{nutrition.completeness.toLowerCase()}</dd>
            </div>
            <div>
              <dt className="text-xs font-black uppercase tracking-wide text-[#4e6a35]">USDA ID</dt>
              <dd className="mt-1 break-all font-bold text-[#18261e]">{nutrition.sourceId}</dd>
            </div>
          </dl>

          <p className="mt-4 rounded-[1.6rem] bg-[#20281f] p-4 text-sm leading-6 text-[#fff8e8] shadow-[0_14px_35px_rgba(32,40,31,0.18)]">
            Reference only. LabelLens calculates from source data and grams; it does not make medical claims.
          </p>
        </div>
      </section>
    </div>,
    document.body,
  );
}
