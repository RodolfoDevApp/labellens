const features = [
  {
    title: "Find foods fast",
    text: "Search common foods and compare calories, protein, carbs and fat before adding them.",
  },
  {
    title: "Build your day",
    text: "Add foods to breakfast, lunch, dinner or snack so your menu stays organized.",
  },
  {
    title: "Adjust by grams",
    text: "Start with 100 g servings and adjust the amount from the menu draft.",
  },
];

export function LandingFeatureGrid() {
  return (
    <section id="features" className="grid gap-4 pb-10 md:grid-cols-3">
      {features.map((feature) => (
        <article
          key={feature.title}
          className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          <h2 className="text-xl font-black">{feature.title}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{feature.text}</p>
        </article>
      ))}
    </section>
  );
}
