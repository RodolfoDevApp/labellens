import { type SortKey } from "../hooks/useFoodSearch";

type FoodResultsToolbarProps = {
  sortBy: SortKey;
  onSortChange: (sortBy: SortKey) => void;
};

const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: "relevance", label: "Best match" },
  { key: "kcal", label: "Most kcal" },
  { key: "protein", label: "Most protein" },
  { key: "carbs", label: "Most carbs" },
  { key: "fat", label: "Most fat" },
];

export function FoodResultsToolbar({
  sortBy,
  onSortChange,
}: FoodResultsToolbarProps) {
  return (
    <div className="ll-row-in mb-4 rounded-[2rem] bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        Sort results
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {sortOptions.map((option) => {
          const isActive = sortBy === option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onSortChange(option.key)}
              className={
                isActive
                  ? "ll-interactive min-h-10 rounded-full bg-slate-950 px-4 text-xs font-black text-white shadow-sm hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  : "ll-interactive min-h-10 rounded-full bg-slate-50 px-4 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-white hover:ring-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
