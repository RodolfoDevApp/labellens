"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AuthModal } from "@/features/auth/components/AuthModal";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";

function HomeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10.5V21h14V10.5" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
      <path d="M4 5v14M7 5v14M11 5v14M14 5v14M18 5v14M20 5v14" />
    </svg>
  );
}

function MenusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 6h14" />
      <path d="M5 12h14" />
      <path d="M5 18h9" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 5v14" />
    </svg>
  );
}

const navItems = [
  { href: "/", label: "Home", icon: <HomeIcon /> },
  { href: "/search", label: "Search", icon: <SearchIcon /> },
  { href: "/scan", label: "Scan", icon: <ScanIcon /> },
  { href: "/menu", label: "Menus", icon: <MenusIcon /> },
];

function DesktopNavLink({ href, label, icon, active }: { href: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex min-h-11 items-center gap-2 px-2 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb84d] ${
        active ? "text-[#0b7a53]" : "text-[#304135] hover:text-[#0b7a53]"
      }`}
    >
      {icon}
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={`absolute inset-x-2 -bottom-1 h-1 rounded-full transition ${
          active ? "bg-[#0b7a53]" : "bg-transparent group-hover:bg-[#d7eeb8]"
        }`}
      />
    </Link>
  );
}

function MobileNavButton({ onClick, label, icon }: { onClick: () => void; label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[0.72rem] font-black text-[#304135] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb84d]"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function AppNavbar() {
  const pathname = usePathname();
  const { hasHydratedAuth, isAuthenticated, logout, user } = useAuthSession();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <header className="ll-print-hide sticky top-0 z-40 border-b border-[#ecd4aa]/80 bg-[#f5ecd8]/92 px-4 py-3 shadow-[0_10px_26px_rgba(88,61,24,0.08)] backdrop-blur-xl sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb84d]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0b7a53] text-white shadow-[0_10px_24px_rgba(11,122,83,0.22)] group-hover:bg-[#075f41]">
              <HomeIcon />
            </span>
            <span className="text-base font-black tracking-tight text-[#18261e]">
              LabelLens
            </span>
          </Link>

          <nav aria-label="Primary" className="ml-auto hidden items-center gap-5 md:flex">
            {navItems.map((item) => (
              <DesktopNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={pathname === item.href}
              />
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            {hasHydratedAuth && isAuthenticated && user ? (
              <>
                <span className="flex min-h-10 items-center gap-2 rounded-full bg-[#edfbdf] px-4 text-sm font-black text-[#0b6b47] ring-1 ring-[#c9e9b5]">
                  <AccountIcon />
                  <span className="max-w-[9rem] truncate">{user.displayName}</span>
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="ll-interactive flex min-h-10 items-center gap-2 rounded-full bg-[#fff8ea] px-4 text-sm font-black text-[#314034] ring-1 ring-[#f0d7ad] hover:bg-[#ffefc2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb84d]"
                >
                  <LogoutIcon />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="ll-interactive flex min-h-10 items-center gap-2 rounded-full bg-[#0b7a53] px-4 text-sm font-black text-white shadow-[0_10px_22px_rgba(11,122,83,0.20)] hover:bg-[#075f41] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb84d]"
              >
                <AccountIcon />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <nav aria-label="Mobile primary" className="ll-print-hide fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 gap-1 rounded-[1.7rem] border border-[#ecd4aa] bg-[#fff8ea]/96 p-1 shadow-[0_18px_46px_rgba(37,20,11,0.18)] backdrop-blur-xl md:hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[0.72rem] font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb84d] ${
                isActive ? "bg-[#0b7a53] text-white" : "text-[#304135] hover:bg-[#ffefc2]"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}

        {hasHydratedAuth && isAuthenticated ? (
          <MobileNavButton onClick={logout} label="Logout" icon={<LogoutIcon />} />
        ) : (
          <MobileNavButton onClick={() => setIsAuthModalOpen(true)} label="Login" icon={<AccountIcon />} />
        )}
      </nav>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Login or register"
        description="Save menus to your account. Search and scan still work without login."
      />
    </>
  );
}
