import Link from "next/link";
import { FoodSearchPanel } from "@/features/food-search/components/FoodSearchPanel";

export default function SearchPage() {
  return (
    <main className="min-h-dvh bg-[#f5f8f4] text-slate-950">
      <section className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-10">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-900 text-sm font-black text-white">
              LL
            </div>
            <span className="text-base font-bold">LabelLens</span>
          </Link>

          <Link
            href="/"
            className="flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-slate-950 ring-1 ring-slate-200"
          >
            Home
          </Link>
        </header>

        <div className="mt-6 flex-1">
          <FoodSearchPanel />
        </div>
      </section>
    </main>
  );
}
