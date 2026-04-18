import Link from "next/link";

export function LandingHeader() {
  return (
    <header className="flex min-w-0 items-center justify-between gap-3">
      <Link href="/" className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-900 text-sm font-black text-white">
          LL
        </div>
        <span className="truncate text-base font-bold tracking-tight">LabelLens</span>
      </Link>

      <Link
        href="/search"
        className="flex min-h-11 shrink-0 items-center rounded-full bg-slate-950 px-5 text-sm font-bold text-white"
      >
        Try it
      </Link>
    </header>
  );
}
