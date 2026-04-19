const features = [
  {
    icon: "🔎",
    title: "Find foods fast",
    text: "Search common foods and preview calories, protein, carbs and fat before adding them.",
  },
  {
    icon: "🥗",
    title: "Build your day",
    text: "Add foods to breakfast, lunch, dinner or snack so your menu stays organized.",
  },
  {
    icon: "⚖️",
    title: "Adjust by grams",
    text: "Edit grams directly and watch the menu totals update without spreadsheet work.",
  },
];

export function LandingFeatureGrid() {
  return (
    <section id="features" className="grid gap-4 pb-10 md:grid-cols-3">
      {features.map((feature) => (
        <article
          key={feature.title}
          className="rounded-3xl border border-[#f0d7ad] bg-[#fff8ea] p-6 shadow-[0_14px_35px_rgba(88,61,24,0.08)]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffe7ad] text-2xl ring-1 ring-[#f0d7ad]" aria-hidden="true">
            {feature.icon}
          </div>
          <h2 className="mt-4 text-xl font-black text-[#18261e]">{feature.title}</h2>
          <p className="mt-3 text-sm leading-6 text-[#5d665d]">{feature.text}</p>
        </article>
      ))}
    </section>
  );
}
