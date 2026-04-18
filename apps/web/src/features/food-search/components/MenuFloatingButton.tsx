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
      className="ll-interactive ll-float-in fixed bottom-5 left-4 right-4 z-40 flex min-h-14 items-center justify-between rounded-2xl bg-[#20281f] px-5 text-left text-white shadow-2xl ring-1 ring-[#fff8ea]/15 hover:bg-[#111811] hover:shadow-[0_18px_40px_rgba(32,40,31,0.28)] focus:outline-none focus:ring-2 focus:ring-[#ffb84d] sm:left-auto sm:right-5 sm:w-[320px]"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffcf66] text-sm font-black text-[#18261e]">
          {itemCount}
        </span>

        <span>
          <span className="block text-sm font-black">View menu</span>
          <span className="block text-xs text-[#efe3ca]">
            {energyKcal ?? "—"} kcal
          </span>
        </span>
      </span>

      <span className="text-lg font-black">→</span>
    </button>
  );
}
