"use client";

import { type FormEvent } from "react";

type FoodSearchFormProps = {
  query: string;
  status: "idle" | "loading" | "success" | "empty" | "error";
  onQueryChange: (value: string) => void;
  onSearch: (query?: string) => Promise<void>;
  onReset: () => void;
};

const quickSearches = ["Oats", "Yogurt", "Milk", "Chicken"];

export function FoodSearchForm({
  query,
  status,
  onQueryChange,
  onSearch,
  onReset,
}: FoodSearchFormProps) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSearch();
  }

  async function handleQuickSearch(value: string) {
    onQueryChange(value);
    await onSearch(value);
  }

  return (
    <form onSubmit={handleSubmit} className="ll-pop-in rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
          USDA FoodData Central
        </p>
        <h1 className="mt-1 text-2xl font-black leading-tight">Food search</h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Search in English. Pick the meal inside each result row.
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
        <div>
          <label htmlFor="food-search" className="text-sm font-black">
            Food name
          </label>

          <div className="relative mt-2">
            <input
              id="food-search"
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Oats, yogurt, milk..."
              className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 text-base outline-none hover:border-emerald-200 hover:bg-white focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />

            {query.length > 0 && (
              <button
                type="button"
                onClick={onReset}
                aria-label="Clear search"
                className="ll-interactive absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sm font-black text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="ll-interactive min-h-14 self-end rounded-2xl bg-emerald-700 px-5 text-base font-black text-white shadow-sm hover:bg-emerald-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          {status === "loading" ? "Searching..." : "Search"}
        </button>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold text-slate-500">Quick searches</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {quickSearches.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => void handleQuickSearch(item)}
              className="ll-interactive min-h-11 rounded-full bg-emerald-50 px-4 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100 hover:bg-emerald-100 hover:ring-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
