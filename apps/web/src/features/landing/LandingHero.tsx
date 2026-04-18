import Link from "next/link";
import { LandingPreview } from "./LandingPreview";

export function LandingHero() {
  return (
    <section className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_520px] lg:gap-20 lg:py-12">
      <div className="min-w-0">
        <p className="inline-flex max-w-full rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold leading-5 text-emerald-800 min-[420px]:text-sm">
          Build meals with clearer calories and macros
        </p>

        <h1 className="mt-6 max-w-[12ch] text-[clamp(2.35rem,11vw,4.25rem)] font-black leading-[1] tracking-tight text-slate-950 lg:text-7xl">
          Understand what you eat before adding it to your menu.
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
          Search foods, compare nutrition per 100 g, and build a daily menu by meal.
          Useful when you care about calories, protein, carbs and fat without fighting spreadsheets.
        </p>

        <div className="mt-8">
          <Link
            href="/search"
            className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-emerald-600 px-6 text-base font-black text-white shadow-sm sm:w-fit"
          >
            Try food search
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2 min-[420px]:gap-3">
          <div className="min-w-0 rounded-3xl bg-white p-3 ring-1 ring-slate-200 min-[420px]:p-4">
            <p className="text-xl font-black min-[420px]:text-2xl">Find</p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">real foods</p>
          </div>

          <div className="min-w-0 rounded-3xl bg-white p-3 ring-1 ring-slate-200 min-[420px]:p-4">
            <p className="text-xl font-black min-[420px]:text-2xl">Add</p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">to meals</p>
          </div>

          <div className="min-w-0 rounded-3xl bg-white p-3 ring-1 ring-slate-200 min-[420px]:p-4">
            <p className="text-xl font-black min-[420px]:text-2xl">Track</p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">daily totals</p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex justify-center">
        <div className="w-full max-w-[430px] rounded-[3.2rem] bg-slate-950 p-4 shadow-2xl">
          <div className="min-h-[640px] overflow-hidden rounded-[2.7rem] bg-[#f7faf8]">
            <div className="p-5">
              <LandingPreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
