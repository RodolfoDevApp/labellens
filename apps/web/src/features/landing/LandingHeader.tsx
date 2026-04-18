import Link from "next/link";

function HomeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10.5V21h14V10.5" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

export function LandingHeader() {
  return (
    <header className="flex min-w-0 items-center justify-between gap-3">
      <Link href="/" className="group flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0b7a53] text-sm font-black text-white shadow-[0_10px_24px_rgba(11,122,83,0.22)] group-hover:bg-[#075f41]">
          <HomeIcon />
        </div>
        <span className="truncate text-base font-black tracking-tight text-[#18261e]">LabelLens</span>
      </Link>

      <Link
        href="/search"
        className="ll-interactive flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#ffe7ad] px-5 text-sm font-black text-[#18261e] shadow-sm ring-1 ring-[#f0d7ad] hover:bg-[#ffd98a] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
      >
        <SearchIcon />
        Search
      </Link>
    </header>
  );
}
