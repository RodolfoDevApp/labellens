import Link from "next/link";
import { type FoodItemDto } from "@/shared/api/foods-api";
import { MacroTile } from "@/shared/ui/MacroTile";
import { PartialDataNotice } from "@/shared/ui/PartialDataNotice";
import { SourceBadge } from "@/shared/ui/SourceBadge";
import { FoodDetailCalculator } from "./FoodDetailCalculator";

function formatMacro(value: number | null | undefined, suffix = ""): string | number {
  return value === null || value === undefined ? "—" : `${value}${suffix}`;
}

export function FoodDetailPage({ food }: { food: FoodItemDto }) {
  return (
    <main className="min-h-dvh bg-[#f5f8f4] text-slate-950">
      <section className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-4 sm:px-6 lg:px-10">
        <header className="flex items-center justify-between gap-3">
          <Link href="/search" className="flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-slate-950 ring-1 ring-slate-200">
            ← Search
          </Link>
          <span className="text-sm font-black text-slate-500">LabelLens</span>
        </header>

        <article className="mt-6 space-y-4 pb-24">
          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <SourceBadge
              source={food.nutrition.source}
              completeness={food.nutrition.completeness}
              lastFetchedAt={food.nutrition.lastFetchedAt}
            />

            <h1 className="mt-4 text-3xl font-black leading-tight">{food.name}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              USDA FDC ID {food.nutrition.sourceId}. Serving reference: {food.servingSize ?? 100}{food.servingSizeUnit ?? "g"}.
            </p>

            <div className="mt-4 grid grid-cols-4 gap-2">
              <MacroTile value={formatMacro(food.nutrition.energyKcalPer100g)} label="kcal/100g" />
              <MacroTile value={formatMacro(food.nutrition.proteinGPer100g, "g")} label="Protein" />
              <MacroTile value={formatMacro(food.nutrition.carbsGPer100g, "g")} label="Carbs" />
              <MacroTile value={formatMacro(food.nutrition.fatGPer100g, "g")} label="Fat" />
            </div>

            <div className="mt-4">
              <PartialDataNotice
                show={food.nutrition.completeness !== "COMPLETE"}
                label="This food has partial nutrition data."
              />
            </div>
          </section>

          <FoodDetailCalculator food={food} />

          <section className="rounded-[2rem] bg-slate-950 p-5 text-white">
            <h2 className="text-xl font-black">Reference only</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              LabelLens calculates from source data per 100 g. It does not make medical claims or fill missing nutrition values.
            </p>
          </section>
        </article>
      </section>
    </main>
  );
}
