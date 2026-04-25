type MacroTileTone = "leaf" | "sun" | "berry" | "peach" | "cream";

type MacroTileProps = {
  value: string | number | null;
  label: string;
  tone?: MacroTileTone;
};

const toneClasses: Record<MacroTileTone, string> = {
  leaf: "border-[#cfe3d0] bg-[#eef7ef] text-[#2c5d44]",
  sun: "border-[#e8d7a8] bg-[#f8f0d8] text-[#695225]",
  berry: "border-[#e4cddd] bg-[#f8eef5] text-[#6a4561]",
  peach: "border-[#e7d3c4] bg-[#f9f1eb] text-[#765241]",
  cream: "border-[#dde5d8] bg-[#f7faf5] text-[#30463a]",
};

export function MacroTile({ value, label, tone = "cream" }: MacroTileProps) {
  return (
    <div className={`rounded-2xl border p-2 text-center shadow-sm ${toneClasses[tone]}`}>
      <p className="text-sm font-black leading-none">{value ?? "—"}</p>
      <p className="mt-1 text-[10px] font-bold opacity-70">{label}</p>
    </div>
  );
}
