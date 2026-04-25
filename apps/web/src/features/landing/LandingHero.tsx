import Link from "next/link";
import { LandingPreview } from "./LandingPreview";

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

function BarcodeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M4 5v14M7 5v14M11 5v14M14 5v14M18 5v14M20 5v14" />
    </svg>
  );
}

const miniCards = [
  { icon: "🔎", title: "Find", text: "real foods" },
  { icon: "🏷️", title: "Scan", text: "barcodes" },
  { icon: "📊", title: "Track", text: "daily totals" },
];

export function LandingHero() {
  return (
    <section className="grid flex-1 items-center gap-6 pb-24 sm:pb-0 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-14">
      <div className="min-w-0">
        <p className="inline-flex max-w-full rounded-full bg-[#e3f0e6] px-4 py-2 text-xs font-black leading-5 text-[#2f7d5c] min-[420px]:text-sm">
          Build meals with clearer calories and macros
        </p>

        <h1 className="mt-4 max-w-[13ch] text-[clamp(2rem,7vw,3.8rem)] font-black leading-[1.02] tracking-tight text-[#183126] lg:text-6xl">
          Understand what you eat before adding it to your menu.
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-7 text-[#5d6d62] sm:text-lg sm:leading-8">
          Search foods, scan packaged products, and build a daily menu by grams
          without fighting spreadsheets.
        </p>

        <div className="mt-5 grid w-full max-w-xl gap-3 sm:grid-cols-2">
          <Link
            href="/search"
            prefetch={false}
            className="ll-interactive flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[#2f7d5c] px-6 text-base font-black text-white shadow-[0_14px_30px_rgba(47,125,92,0.22)] hover:bg-[#26684c] focus:outline-none focus:ring-2 focus:ring-[#9bc8b5]"
          >
            <SearchIcon />
            Search foods
          </Link>
          <Link
            href="/scan"
            prefetch={false}
            className="ll-interactive flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[#dfead7] px-6 text-base font-black text-[#183126] shadow-[0_14px_30px_rgba(47,83,66,0.10)] ring-1 ring-[#c7d8c5] hover:bg-[#d4e3cb] focus:outline-none focus:ring-2 focus:ring-[#9bc8b5]"
          >
            <BarcodeIcon />
            Scan label
          </Link>
        </div>

        <div className="mt-6 hidden grid-cols-3 gap-2 sm:grid min-[420px]:gap-3">
          {miniCards.map((card) => (
            <div key={card.title} className="min-w-0 rounded-3xl border border-[#dde7db] bg-[#fffdfa] p-3 shadow-[0_12px_30px_rgba(58,81,67,0.08)]">
              <p className="text-2xl" aria-hidden="true">{card.icon}</p>
              <p className="mt-2 text-lg font-black text-[#183126] min-[420px]:text-xl">{card.title}</p>
              <p className="mt-1 text-[11px] font-bold leading-4 text-[#617066]">{card.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden justify-center lg:flex">
        <div className="w-full max-w-[390px] rounded-[3rem] bg-[#27332e] p-4 shadow-2xl shadow-[#20362d]/18">
          <div className="min-h-[540px] overflow-hidden rounded-[2.5rem] bg-[#f7f4ec]">
            <div className="p-5">
              <LandingPreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
