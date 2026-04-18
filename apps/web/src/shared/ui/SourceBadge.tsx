type SourceBadgeProps = {
  source: "USDA" | "OPEN_FOOD_FACTS";
  completeness: "COMPLETE" | "PARTIAL" | "LOW";
  lastFetchedAt?: string;
};

function formatDate(value?: string): string {
  if (!value) {
    return "freshness unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "freshness unknown";
  }

  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

export function SourceBadge({ source, completeness, lastFetchedAt }: SourceBadgeProps) {
  return (
    <span className="inline-flex min-h-8 shrink-0 items-center rounded-full bg-emerald-100 px-3 text-[11px] font-black uppercase tracking-wide text-emerald-800">
      {source} · {completeness.toLowerCase()} · {formatDate(lastFetchedAt)}
    </span>
  );
}
