type MenuFloatingButtonProps = {
  itemCount: number;
  energyKcal: number | null;
  onOpen: () => void;
};

export function MenuFloatingButton({
  itemCount,
  energyKcal,
  onOpen,
}: MenuFloatingButtonProps) {
  if (itemCount === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="ll-interactive ll-float-in fixed bottom-5 left-4 right-4 z-40 flex min-h-14 items-center justify-between rounded-2xl bg-slate-950 px-5 text-left text-white shadow-2xl ring-1 ring-white/10 hover:bg-slate-900 hover:shadow-[0_18px_40px_rgba(15,23,42,0.28)] focus:outline-none focus:ring-2 focus:ring-emerald-400 sm:left-auto sm:right-5 sm:w-[320px]"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-sm font-black text-slate-950">
          {itemCount}
        </span>

        <span>
          <span className="block text-sm font-black">View menu</span>
          <span className="block text-xs text-slate-300">
            {energyKcal ?? "—"} kcal
          </span>
        </span>
      </span>

      <span className="text-lg font-black">→</span>
    </button>
  );
}
