import { LandingFeatureGrid } from "@/features/landing/LandingFeatureGrid";
import { LandingHero } from "@/features/landing/LandingHero";

export default function Home() {
  return (
    <main className="overflow-x-hidden text-[#183126]">
      <section className="mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full max-w-7xl flex-col px-4 py-4 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-6 lg:px-10 lg:py-6">
        <LandingHero />
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        <LandingFeatureGrid />

        <section
          id="privacy"
          className="mt-8 rounded-3xl border border-[#d9e4d8] bg-[#24342d] p-6 text-[#fffaf2] shadow-[0_18px_45px_rgba(36,52,45,0.16)] md:p-8"
        >
          <h2 className="text-2xl font-black">
            No medical claims. No invented nutrition data.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#e8dfcf]">
            LabelLens shows external nutrition data, marks incomplete information,
            and does not replace a healthcare professional. The app calculates; you decide.
          </p>
        </section>
      </section>
    </main>
  );
}
