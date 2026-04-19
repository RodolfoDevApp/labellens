"use client";

import { type FormEvent, type ReactNode } from "react";

type FoodSearchFormProps = {
  query: string;
  status: "idle" | "loading" | "success" | "empty" | "error";
  onQueryChange: (value: string) => void;
  onSearch: (query?: string) => Promise<void>;
  onReset: () => void;
  headerAction?: ReactNode;
};

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

export function FoodSearchForm({
  query,
  status,
  onQueryChange,
  onSearch,
  onReset,
  headerAction,
}: FoodSearchFormProps) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSearch();
  }


  return (
    <form onSubmit={handleSubmit} className="ll-pop-in rounded-[2rem] border border-[#f0d7ad] bg-[#fff8ea] p-4 shadow-[0_18px_45px_rgba(88,61,24,0.10)]">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#0b7a53]">
            USDA FoodData Central
          </p>
          <h1 className="mt-1 text-2xl font-black leading-tight text-[#18261e]">Food search</h1>
          <p className="mt-1 text-sm leading-6 text-[#5d665d]">
            Search in English. Pick the meal inside each result row.
          </p>
        </div>

        {headerAction ? <div className="sm:justify-self-end">{headerAction}</div> : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
        <div>
          <label htmlFor="food-search" className="text-sm font-black text-[#18261e]">
            Food name
          </label>

          <div className="relative mt-2">
            <input
              id="food-search"
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Oats, yogurt, milk..."
              className="min-h-14 w-full rounded-2xl border border-[#f0d7ad] bg-[#f5ecd8] px-4 pr-12 text-base text-[#18261e] outline-none hover:border-[#d8e7bd] hover:bg-[#fffaf2] focus:border-[#0b7a53] focus:bg-[#fffaf2] focus:ring-2 focus:ring-[#c9f0a0]"
            />

            {query.length > 0 && (
              <button
                type="button"
                onClick={onReset}
                aria-label="Clear search"
                className="ll-interactive absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#f0d7ad] bg-[#fff8ea] text-sm font-black text-[#6b5430] hover:bg-[#ffe7ad] hover:text-[#18261e] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="ll-interactive flex min-h-14 items-center justify-center gap-2 self-end rounded-2xl bg-[#0b7a53] px-5 text-base font-black text-white shadow-[0_10px_24px_rgba(11,122,83,0.24)] hover:bg-[#075f41] hover:shadow-[0_14px_28px_rgba(11,122,83,0.28)] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
        >
          <SearchIcon />
          {status === "loading" ? "Searching..." : "Search"}
        </button>
      </div>
    </form>
  );
}
