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

const miniCards = [
  { icon: "🔎", title: "Find", text: "real foods" },
  { icon: "🥣", title: "Add", text: "to meals" },
  { icon: "📊", title: "Track", text: "daily totals" },
];

export function LandingHero() {
  return (
    <section className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_520px] lg:gap-20 lg:py-12">
      <div className="min-w-0">
        <p className="inline-flex max-w-full rounded-full bg-[#dff6c8] px-4 py-2 text-xs font-black leading-5 text-[#0b6b47] min-[420px]:text-sm">
          Build meals with clearer calories and macros
        </p>

        <h1 className="mt-6 max-w-[12ch] text-[clamp(2.35rem,11vw,4.25rem)] font-black leading-[1] tracking-tight text-[#18261e] lg:text-7xl">
          Understand what you eat before adding it to your menu.
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-[#5d665d] sm:text-lg sm:leading-8">
          Search foods, compare nutrition per 100 g, and build a daily menu by meal.
          Useful when you care about calories, protein, carbs and fat without fighting spreadsheets.
        </p>

        <div className="mt-8 w-full max-w-xl">
          <Link
            href="/search"
            className="ll-interactive flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#0b7a53] px-6 text-base font-black text-white shadow-[0_14px_30px_rgba(11,122,83,0.25)] hover:bg-[#075f41] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
          >
            <SearchIcon />
            Try food search
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2 min-[420px]:gap-3">
          {miniCards.map((card) => (
            <div key={card.title} className="min-w-0 rounded-3xl border border-[#f0d7ad] bg-[#fff8ea] p-3 shadow-[0_12px_30px_rgba(88,61,24,0.08)] min-[420px]:p-4">
              <p className="text-2xl" aria-hidden="true">{card.icon}</p>
              <p className="mt-2 text-xl font-black text-[#18261e] min-[420px]:text-2xl">{card.title}</p>
              <p className="mt-1 text-[11px] font-bold leading-4 text-[#6b756c]">{card.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden justify-center lg:flex">
        <div className="w-full max-w-[430px] rounded-[3.2rem] bg-[#20281f] p-4 shadow-2xl shadow-[#4d3418]/20">
          <div className="min-h-[640px] overflow-hidden rounded-[2.7rem] bg-[#f5ecd8]">
            <div className="p-5">
              <LandingPreview />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
