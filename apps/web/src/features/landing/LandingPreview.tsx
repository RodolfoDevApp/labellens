import { MacroTile } from "@/shared/ui/MacroTile";

export function LandingPreview() {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-[#0b7a53]">LabelLens</p>
          <p className="text-2xl font-black leading-tight text-[#18261e]">Food to menu</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0b7a53] text-sm font-black text-white shadow-[0_10px_24px_rgba(11,122,83,0.22)]">
          LL
        </div>
      </div>

      <div className="mt-6 rounded-[2rem] border border-[#f0d7ad] bg-[#fff8ea] p-4 shadow-[0_14px_35px_rgba(88,61,24,0.08)]">
        <p className="text-xs font-black uppercase tracking-wide text-[#0b7a53]">
          Search result
        </p>

        <div className="mt-3">
          <p className="text-xl font-black leading-tight text-[#18261e]">Oats, raw</p>
          <p className="mt-1 text-xs font-bold text-[#6b756c]">Preview updates with grams</p>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <MacroTile value="389" label="kcal" tone="sun" />
          <MacroTile value="16.9g" label="Protein" tone="leaf" />
          <MacroTile value="66.3g" label="Carbs" tone="berry" />
          <MacroTile value="6.9g" label="Fat" tone="peach" />
        </div>

        <div className="mt-4 grid gap-2">
          <select className="min-h-12 rounded-2xl border border-[#c9e9b5] bg-[#f0fbdc] px-3 text-sm font-bold text-[#18261e]">
            <option>Breakfast</option>
            <option>Lunch</option>
            <option>Dinner</option>
            <option>Snack</option>
          </select>

          <button className="min-h-12 rounded-2xl bg-[#0b7a53] text-sm font-black text-white shadow-[0_10px_24px_rgba(11,122,83,0.24)]">
            Add 100 g
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-[2rem] bg-[#20281f] p-4 text-white shadow-[0_16px_40px_rgba(32,40,31,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#b8e07a]">
              Today’s menu
            </p>
            <p className="mt-1 text-xl font-black">Breakfast</p>
          </div>

          <span className="rounded-full bg-[#ffe7ad] px-3 py-1 text-xs font-black text-[#18261e]">
            389 kcal
          </span>
        </div>

        <div className="mt-4 rounded-3xl bg-[#fff8ea]/10 p-3 ring-1 ring-[#fff8ea]/15">
          <p className="text-sm font-black">Oats, raw</p>
          <p className="mt-1 text-xs text-[#efe3ca]">100 g added</p>
        </div>
      </div>
    </div>
  );
}
