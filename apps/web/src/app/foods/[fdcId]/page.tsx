import Link from "next/link";
import { FoodDetailPage } from "@/features/food-detail/components/FoodDetailPage";
import { getFoodById } from "@/shared/api/foods-api";

type PageProps = {
  params: Promise<{
    fdcId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { fdcId } = await params;

  try {
    const result = await getFoodById(fdcId);

    return <FoodDetailPage food={result.food} />;
  } catch (error) {
    return (
      <main className="min-h-dvh bg-[#f5f8f4] px-4 py-6 text-slate-950">
        <section className="mx-auto max-w-xl rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">
            Food detail unavailable
          </p>
          <h1 className="mt-2 text-2xl font-black">Could not load USDA food</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {error instanceof Error ? error.message : "The local API did not return a food detail."}
          </p>
          <Link href="/search" className="mt-5 flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
            Back to search
          </Link>
        </section>
      </main>
    );
  }
}
