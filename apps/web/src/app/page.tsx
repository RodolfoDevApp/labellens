"use client";

import { FormEvent, useState } from "react";
import { FoodItemDto, searchFoods } from "@/shared/api/foods-api";

const quickSearches = ["Avena", "Yogur", "Cereal", "Leche"];

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

function FoodResultCard({ food }: { food: FoodItemDto }) {
  return (
    <article className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black">{food.name}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Fuente {food.nutrition.source} · {food.nutrition.completeness.toLowerCase()}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
          {food.dataType ?? "food"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <div className="rounded-2xl bg-slate-50 p-2">
          <p className="text-sm font-black">{food.nutrition.energyKcalPer100g ?? "—"}</p>
          <p className="text-[10px] text-slate-500">kcal</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-2">
          <p className="text-sm font-black">{food.nutrition.proteinGPer100g ?? "—"}g</p>
          <p className="text-[10px] text-slate-500">Prot</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-2">
          <p className="text-sm font-black">{food.nutrition.carbsGPer100g ?? "—"}g</p>
          <p className="text-[10px] text-slate-500">Carb</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-2">
          <p className="text-sm font-black">{food.nutrition.fatGPer100g ?? "—"}g</p>
          <p className="text-[10px] text-slate-500">Grasa</p>
        </div>
      </div>

      <button className="mt-4 min-h-12 w-full rounded-2xl bg-emerald-600 text-sm font-black text-white">
        Agregar 40 g
      </button>
    </article>
  );
}

function DemoCard() {
  const [query, setQuery] = useState("oats");
  const [items, setItems] = useState<FoodItemDto[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "empty" | "error">(
    "idle",
  );

  async function runSearch(nextQuery = query) {
    const trimmed = nextQuery.trim();

    if (trimmed.length < 2) {
      setStatus("empty");
      setItems([]);
      return;
    }

    setStatus("loading");

    try {
      const result = await searchFoods(trimmed);
      setItems(result.items);
      setStatus(result.items.length > 0 ? "success" : "empty");
    } catch {
      setStatus("error");
      setItems([]);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch();
  }

  async function handleQuickSearch(value: string) {
    setQuery(value);
    await runSearch(value);
  }

  return (
    <section className="w-full rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-emerald-700">LabelLens</p>
          <p className="text-base font-black">Busca alimentos reales</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-900 text-sm font-black text-white">
          LL
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 rounded-3xl bg-slate-50 p-3">
        <label htmlFor="food-search" className="text-sm font-black">
          Alimento
        </label>

        <div className="mt-3 grid gap-2 min-[420px]:grid-cols-[1fr_auto]">
          <input
            id="food-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Oats, yogurt..."
            className="min-h-12 min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none"
          />
          <button
            type="submit"
            className="min-h-12 rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white"
          >
            {status === "loading" ? "Buscando" : "Buscar"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {quickSearches.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => void handleQuickSearch(item)}
              className="min-h-11 rounded-full bg-emerald-50 px-4 text-xs font-bold text-emerald-800 ring-1 ring-emerald-100"
            >
              {item}
            </button>
          ))}
        </div>
      </form>

      <div className="mt-4 space-y-3">
        {status === "idle" && (
          <div className="rounded-3xl bg-emerald-950 p-4 text-white">
            <p className="text-sm font-black">Prueba con “oats” o “yogurt”.</p>
            <p className="mt-1 text-xs text-emerald-50">
              Por ahora usamos fixtures locales. Después conectamos USDA real.
            </p>
          </div>
        )}

        {status === "loading" && (
          <div className="rounded-3xl bg-white p-4 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
            Buscando alimentos...
          </div>
        )}

        {status === "error" && (
          <div className="rounded-3xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
            No se pudo conectar con la API local. Revisa que apps/api esté corriendo en el puerto 4000.
          </div>
        )}

        {status === "empty" && (
          <div className="rounded-3xl bg-amber-50 p-4 text-sm font-bold text-amber-700 ring-1 ring-amber-100">
            No encontramos resultados. Prueba con oats o yogurt.
          </div>
        )}

        {items.map((food) => (
          <FoodResultCard key={food.id} food={food} />
        ))}
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
            <div className="mx-auto w-full max-w-[430px] rounded-[2.4rem] bg-slate-950 p-3 shadow-2xl">
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

