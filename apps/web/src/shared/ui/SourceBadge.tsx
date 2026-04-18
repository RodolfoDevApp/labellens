type SourceBadgeProps = {
  label: string;
};

export function SourceBadge({ label }: SourceBadgeProps) {
  return (
    <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
      {label}
    </span>
  );
}
