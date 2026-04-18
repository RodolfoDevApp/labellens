import {
  type MealKey,
  type MenuDraftItem,
  mealOptions,
} from "../hooks/useFoodSearch";
import { MacroTile } from "@/shared/ui/MacroTile";

type MenuTotals = {
  energyKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

type MenuDrawerProps = {
  isOpen: boolean;
  items: MenuDraftItem[];
  totals: MenuTotals;
  onClose: () => void;
  onIncrease: (itemId: string) => void;
  onDecrease: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onClear: () => void;
};

function formatMacro(value: number | null, suffix = ""): string {
  return value === null ? "—" : `${value}${suffix}`;
}

function itemsByMeal(items: MenuDraftItem[], meal: MealKey): MenuDraftItem[] {
  return items.filter((item) => item.meal === meal);
}

export function MenuDrawer({
  isOpen,
  items,
  totals,
  onClose,
  onIncrease,
  onDecrease,
  onRemove,
  onClear,
}: MenuDrawerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close menu draft"
        onClick={onClose}
        className="ll-fade-in absolute inset-0 bg-slate-950/45 transition-colors duration-200 ease-out hover:bg-slate-950/50"
      />

      <aside className="ll-drawer-in absolute inset-0 overflow-y-auto bg-white p-4 shadow-2xl md:left-auto md:w-[60vw] md:max-w-[860px] md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Menu draft
            </p>
            <h2 className="mt-1 text-3xl font-black leading-tight">
              {items.length} {items.length === 1 ? "food" : "foods"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Repeated foods are merged by meal. Use + / − to adjust 100 g at a time.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ll-interactive min-h-11 rounded-full bg-slate-100 px-4 text-sm font-black text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2">
          <MacroTile value={formatMacro(totals.energyKcal)} label="kcal" />
          <MacroTile value={formatMacro(totals.proteinG, "g")} label="Protein" />
          <MacroTile value={formatMacro(totals.carbsG, "g")} label="Carbs" />
          <MacroTile value={formatMacro(totals.fatG, "g")} label="Fat" />
        </div>

        <div className="mt-6 space-y-5">
          {mealOptions.map((meal) => {
            const mealItems = itemsByMeal(items, meal.key);

            return (
              <section key={meal.key} className="ll-row-in">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
                    {meal.label}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                    {mealItems.length}
                  </span>
                </div>

                {mealItems.length === 0 ? (
                  <div className="rounded-3xl bg-slate-50 p-4 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
                    No foods added.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mealItems.map((item) => (
                      <div
                        key={item.id}
                        className="ll-card rounded-3xl bg-slate-50 p-3 ring-1 ring-slate-100"
                      >
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                          <div className="min-w-0">
                            <p className="text-sm font-black leading-tight">
                              {item.food.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.grams} g · USDA
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onDecrease(item.id)}
                              className="ll-interactive flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                              aria-label={`Decrease ${item.food.name}`}
                            >
                              −
                            </button>

                            <button
                              type="button"
                              onClick={() => onIncrease(item.id)}
                              className="ll-interactive flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                              aria-label={`Increase ${item.food.name}`}
                            >
                              +
                            </button>

                            <button
                              type="button"
                              onClick={() => onRemove(item.id)}
                              className="ll-interactive min-h-10 rounded-full bg-white px-3 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-red-50 hover:text-red-700 hover:ring-red-100 focus:outline-none focus:ring-2 focus:ring-red-100"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="ll-interactive mt-6 min-h-12 w-full rounded-2xl bg-slate-950 text-sm font-black text-white hover:bg-slate-900 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            Clear menu
          </button>
        )}
      </aside>
    </div>
  );
}
