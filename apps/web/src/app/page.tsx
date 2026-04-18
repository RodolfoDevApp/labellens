import { LandingFeatureGrid } from "@/features/landing/LandingFeatureGrid";
import { LandingHeader } from "@/features/landing/LandingHeader";
import { LandingHero } from "@/features/landing/LandingHero";

export default function Home() {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#f5f8f4] text-slate-950">
      <section className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-10">
        <LandingHeader />
        <LandingHero />
        <LandingFeatureGrid />

        <section
          id="privacy"
          className="mb-8 rounded-3xl bg-slate-950 p-6 text-white md:p-8"
        >
          <h2 className="text-2xl font-black">
            No medical claims. No invented nutrition data.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            LabelLens shows external nutrition data, marks incomplete information,
            and does not replace a healthcare professional. The app calculates; you decide.
          </p>
        </section>
      </section>
    </main>
  );
}
