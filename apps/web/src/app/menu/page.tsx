import { ProfileMenusPanel } from "@/features/profile/components/ProfileMenusPanel";

export default function MenuPage() {
  return (
    <main className="min-h-[calc(100dvh-4.5rem)] text-[#18261e]">
      <section className="mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-10">
        <ProfileMenusPanel />
      </section>
    </main>
  );
}
