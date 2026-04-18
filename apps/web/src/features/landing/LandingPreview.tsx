import { MacroTile } from "@/shared/ui/MacroTile";

export function LandingPreview() {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-emerald-700">LabelLens</p>
          <p className="text-2xl font-black leading-tight">Food to menu</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-900 text-sm font-black text-white">
          LL
        </div>
      </div>

      <div className="mt-6 rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
          Search result
        </p>

        <div className="mt-3">
          <p className="text-xl font-black leading-tight">Oats, raw</p>
          <p className="mt-1 text-xs text-slate-500">Nutrition per 100 g</p>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <MacroTile value="389" label="kcal" />
          <MacroTile value="16.9g" label="Protein" />
          <MacroTile value="66.3g" label="Carbs" />
          <MacroTile value="6.9g" label="Fat" />
        </div>

        <div className="mt-4 grid gap-2">
          <select className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold">
            <option>Breakfast</option>
            <option>Lunch</option>
            <option>Dinner</option>
            <option>Snack</option>
          </select>

          <button className="min-h-12 rounded-2xl bg-emerald-600 text-sm font-black text-white">
            Add 100 g
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-[2rem] bg-slate-950 p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">
              Menu draft
            </p>
            <p className="mt-1 text-xl font-black">Breakfast</p>
          </div>

          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">
            389 kcal
          </span>
        </div>

        <div className="mt-4 rounded-3xl bg-white/10 p-3">
          <p className="text-sm font-black">Oats, raw</p>
          <p className="mt-1 text-xs text-slate-300">100 g added</p>
        </div>
      </div>
    </div>
  );
}
