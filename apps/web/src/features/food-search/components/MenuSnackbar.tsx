"use client";

import { useEffect } from "react";

type MenuSnackbarProps = {
  message: string | null;
  onViewMenu: () => void;
  onDismiss: () => void;
};

export function MenuSnackbar({
  message,
  onViewMenu,
  onDismiss,
}: MenuSnackbarProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onDismiss();
    }, 2800);

    return () => window.clearTimeout(timeoutId);
  }, [message, onDismiss]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-5"
    >
      <div className="ll-snackbar-in mx-auto flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-emerald-700 px-4 py-3 text-white shadow-2xl ring-1 ring-emerald-500/30">
        <p className="min-w-0 text-sm font-black sm:text-base">
          {message}
        </p>

        <button
          type="button"
          onClick={onViewMenu}
          className="ll-interactive min-h-10 shrink-0 rounded-xl bg-white px-4 text-xs font-black text-emerald-800 shadow-sm hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-white/80 sm:text-sm"
        >
          View menu
        </button>
      </div>
    </div>
  );
}
