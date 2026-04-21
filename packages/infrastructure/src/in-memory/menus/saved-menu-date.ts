export function normalizeMenuDate(date: string | undefined, now: Date): string {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  return now.toISOString().slice(0, 10);
}

function fallbackMenuName(date: string, now: Date): string {
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  const labelDate = Number.isNaN(parsedDate.getTime()) ? now : parsedDate;

  return `Menu for ${labelDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

export function normalizeMenuName(name: string | undefined, date: string, now: Date): string {
  const trimmedName = name?.trim();
  return trimmedName && trimmedName.length > 0 ? trimmedName : fallbackMenuName(date, now);
}
