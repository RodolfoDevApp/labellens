type MacroTileTone = "leaf" | "sun" | "berry" | "peach" | "cream";

type MacroTileProps = {
  value: string | number | null;
  label: string;
  tone?: MacroTileTone;
};

const toneClasses: Record<MacroTileTone, string> = {
  leaf: "border-[#c9e9b5] bg-[#edfbdf] text-[#234f2b]",
  sun: "border-[#f5d27a] bg-[#fff0b8] text-[#664b00]",
  berry: "border-[#f4bfd0] bg-[#ffe7ef] text-[#71304a]",
  peach: "border-[#f3c0a4] bg-[#ffe8d8] text-[#753b22]",
  cream: "border-[#efd8b7] bg-[#f5ecd8] text-[#33291b]",
};

export function MacroTile({ value, label, tone = "cream" }: MacroTileProps) {
  return (
    <div className={`rounded-2xl border p-2 text-center shadow-sm ${toneClasses[tone]}`}>
      <p className="text-sm font-black leading-none">{value ?? "—"}</p>
      <p className="mt-1 text-[10px] font-bold opacity-70">{label}</p>
    </div>
  );
}
