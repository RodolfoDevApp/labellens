const quickSearches = ["Avena", "Yogurt", "Cereal", "Leche"];

const features = [
  {
    title: "Escanea productos reales",
    text: "Busca por código de barras y revisa ingredientes, alérgenos y nutrición cuando la fuente lo tenga.",
  },
  {
    title: "Arma menús por gramos",
    text: "Agrega alimentos a desayuno, comida, cena o snack y calcula calorías/macros al instante.",
  },
  {
    title: "Compara sin adivinar",
    text: "Compara productos por 100 g o por la cantidad que realmente vas a comer.",
  },
];

function DemoCard() {
  return (
    <section className="w-full rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-emerald-700">LabelLens</p>
          <p className="text-base font-black">Busca o escanea</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-900 text-sm font-black text-white">
          LL
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-slate-50 p-3">
        <label className="text-sm font-black">Alimento o producto</label>

        <div className="mt-3 grid gap-2 min-[420px]:grid-cols-[1fr_auto]">
          <input
            type="search"
            placeholder="Avena, yogurt..."
            className="min-h-12 min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none"
          />
          <button className="min-h-12 rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white">
            Buscar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {quickSearches.map((item) => (
            <button
              key={item}
              className="min-h-11 rounded-full bg-emerald-50 px-4 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black">Desayuno temporal</p>
            <p className="text-xs text-slate-500">Agrega gramos y mira el total.</p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
            parcial
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white p-3">
          <span className="text-sm font-bold">Avena</span>
          <span className="text-sm font-black">40 g</span>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[
            ["156", "kcal"],
            ["5g", "Prot"],
            ["26g", "Carb"],
            ["3g", "Grasa"],
          ].map(([value, label]) => (
            <div key={label} className="min-w-0 rounded-2xl bg-white p-2">
              <p className="text-sm font-black min-[420px]:text-base">{value}</p>
              <p className="text-[10px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <button className="mt-4 min-h-14 w-full rounded-2xl bg-emerald-400 text-base font-black text-slate-950 shadow-sm">
        Escanear producto
      </button>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#f5f8f4] text-slate-950">
      <section className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-10">
        <header className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-900 text-sm font-black text-white">
              LL
            </div>
            <span className="truncate text-base font-bold tracking-tight">LabelLens</span>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-950">
              Cómo funciona
            </a>
            <a href="#demo" className="hover:text-slate-950">
              Demo
            </a>
            <a href="#privacy" className="hover:text-slate-950">
              Seguridad
            </a>
          </nav>

          <button className="min-h-11 shrink-0 rounded-full bg-slate-950 px-5 text-sm font-bold text-white">
            Entrar
          </button>
        </header>

        <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-16 lg:py-12">
          <div className="min-w-0">
            <p className="inline-flex max-w-full rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold leading-5 text-emerald-800 min-[420px]:text-sm">
              PWA mobile-first · datos reales · sin IA inventando comida
            </p>

            <h1 className="mt-6 max-w-[12ch] text-[clamp(2.35rem,11vw,4.25rem)] font-black leading-[1] tracking-tight text-slate-950 lg:text-7xl">
              Entiende lo que comes antes de guardarlo en tu menú.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Escanea productos, busca alimentos reales y calcula calorías/macros por gramos.
              Ideal si ya tienes una dieta o simplemente quieres dejar de pelearte con tablas nutricionales.
            </p>

            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <a
                href="#demo"
                className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-emerald-600 px-6 text-base font-black text-white shadow-sm sm:w-auto"
              >
                Probar búsqueda
              </a>
              <a
                href="#features"
                className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-white px-6 text-base font-bold text-slate-950 ring-1 ring-slate-200 sm:w-auto"
              >
                Ver cómo funciona
              </a>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-2 min-[420px]:gap-3">
              <div className="min-w-0 rounded-3xl bg-white p-3 ring-1 ring-slate-200 min-[420px]:p-4">
                <p className="text-xl font-black min-[420px]:text-2xl">USDA</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">alimentos genéricos</p>
              </div>
              <div className="min-w-0 rounded-3xl bg-white p-3 ring-1 ring-slate-200 min-[420px]:p-4">
                <p className="text-xl font-black min-[420px]:text-2xl">OFF</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">productos escaneados</p>
              </div>
              <div className="min-w-0 rounded-3xl bg-white p-3 ring-1 ring-slate-200 min-[420px]:p-4">
                <p className="text-xl font-black min-[420px]:text-2xl">g</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">cálculo por gramos</p>
              </div>
            </div>

            <div id="demo" className="mt-8 lg:hidden">
              <DemoCard />
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="mx-auto w-full max-w-[390px] rounded-[2.4rem] bg-slate-950 p-3 shadow-2xl">
              <div className="overflow-hidden rounded-[2rem] bg-[#f7faf8]">
                <div className="px-4 py-4">
                  <DemoCard />
                </div>
              </div>
            </div>
          </div>
        </section>

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

        <section
          id="privacy"
          className="mb-8 rounded-3xl bg-slate-950 p-6 text-white md:p-8"
        >
          <h2 className="text-2xl font-black">Sin diagnósticos raros. Sin datos inventados.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            LabelLens muestra datos de fuentes externas, indica cuando algo está incompleto y no
            reemplaza a un profesional de salud. La app calcula; tú decides.
          </p>
        </section>
      </section>
    </main>
  );
}
