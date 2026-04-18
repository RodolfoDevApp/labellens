type MacroTileProps = {
  value: string | number | null;
  label: string;
};

export function MacroTile({ value, label }: MacroTileProps) {
  return (
    <div className="rounded-2xl bg-slate-50 p-2 text-center">
      <p className="text-sm font-black">{value ?? "—"}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}
