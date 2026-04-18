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
    <div className="ll-row-in mb-4 rounded-[2rem] border border-[#f0d7ad] bg-[#fff8ea] p-3 shadow-[0_12px_30px_rgba(88,61,24,0.08)]">
      <p className="text-xs font-black uppercase tracking-wide text-[#6b5430]">
        Sort source values
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
                  ? "ll-interactive min-h-10 rounded-full bg-[#20281f] px-4 text-xs font-black text-white shadow-sm hover:bg-[#111811] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
                  : "ll-interactive min-h-10 rounded-full border border-[#f0d7ad] bg-[#f5ecd8] px-4 text-xs font-black text-[#5b4b32] hover:bg-[#ffe7ad] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
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
