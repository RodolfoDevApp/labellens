"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type AuthSession, useAuthSession } from "../hooks/useAuthSession";

type AuthModalMode = "login" | "register";

type AuthModalProps = {
  isOpen: boolean;
  title?: string;
  description?: string;
  initialMode?: AuthModalMode;
  onClose: () => void;
  onAuthenticated?: (session: AuthSession) => void | Promise<void>;
};

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function normalizeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Something went wrong. Try again.";
  }

  if (error.message.toLowerCase().includes("fetch")) {
    return "Cannot reach the app server. Start the API and try again.";
  }

  return error.message;
}

export function AuthModal({
  isOpen,
  title = "Login or register",
  description = "Save menus to your account. Search and scan still work without login.",
  initialMode = "login",
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  const { login, isLoggingIn } = useAuthSession();
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const actionLabel = useMemo(() => {
    const suffix = onAuthenticated ? " and save" : "";
    return mode === "login" ? `Sign in${suffix}` : `Create account${suffix}`;
  }, [mode, onAuthenticated]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setMode(initialMode);
    setError(null);
    setSuccess(null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => firstInputRef.current?.focus() ?? closeButtonRef.current?.focus(), 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [initialMode, isOpen, onClose]);

  function switchMode(nextMode: AuthModalMode) {
    setMode(nextMode);
    setError(null);
    setSuccess(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === "register" && displayName.trim().length === 0) {
      setError("Add your name to create the account.");
      return;
    }

    try {
      const session = await login({
        mode,
        email,
        password,
        ...(mode === "register" ? { displayName } : {}),
      });

      await onAuthenticated?.(session);
      setSuccess(mode === "register" ? "Account created." : "Signed in.");
      window.setTimeout(onClose, 650);
    } catch (loginError) {
      setError(normalizeError(loginError));
    }
  }

  if (!mounted || !isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#25140b]/58 p-0 backdrop-blur-[3px] sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close account modal"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        aria-describedby="auth-modal-description"
        className="relative flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] border border-[#efd8b7] bg-[#f5ecd8] shadow-[0_28px_90px_rgba(37,20,11,0.34)] sm:rounded-[2.2rem]"
      >
        <header className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-[#ecd4aa] bg-[#fff1d1]/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-[#0b7a53]">
              Account
            </p>
            <h2 id="auth-modal-title" className="mt-1 text-2xl font-black leading-tight text-[#18261e]">
              {title}
            </h2>
            <p id="auth-modal-description" className="mt-1 max-w-md text-sm leading-6 text-[#5d665d]">
              {description}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close account modal"
            className="ll-interactive flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#f2d59e] bg-[#fff8ea] text-2xl font-black leading-none text-[#243027] shadow-[0_10px_24px_rgba(88,61,24,0.12)] hover:bg-[#ffefc2] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <form onSubmit={onSubmit} className="rounded-[1.8rem] border border-[#d8e7bd] bg-[#f0fbdc] p-4 shadow-[0_16px_36px_rgba(60,89,52,0.08)] sm:p-5">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#dff6c8] p-1" role="tablist" aria-label="Account mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                onClick={() => switchMode("login")}
                className={`min-h-12 rounded-xl text-sm font-black transition ${
                  mode === "login"
                    ? "bg-[#fff8ea] text-[#18261e] shadow-sm"
                    : "text-[#315b37] hover:bg-[#edfbdf]"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                onClick={() => switchMode("register")}
                className={`min-h-12 rounded-xl text-sm font-black transition ${
                  mode === "register"
                    ? "bg-[#fff8ea] text-[#18261e] shadow-sm"
                    : "text-[#315b37] hover:bg-[#edfbdf]"
                }`}
              >
                Register
              </button>
            </div>

            {mode === "register" ? (
              <label className="mt-5 grid gap-2 text-sm font-black text-[#465246]">
                Name
                <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-[#c9e9b5] bg-[#fff8ea] px-4 focus-within:border-[#0b7a53] focus-within:ring-2 focus-within:ring-[#c9f0a0]">
                  <span className="text-[#0b7a53]">
                    <UserIcon />
                  </span>
                  <input
                    ref={firstInputRef}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    minLength={1}
                    maxLength={60}
                    className="min-w-0 flex-1 bg-transparent text-base font-black text-[#18261e] outline-none"
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>
              </label>
            ) : null}

            <label className="mt-5 grid gap-2 text-sm font-black text-[#465246]">
              Email
              <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-[#c9e9b5] bg-[#fff8ea] px-4 focus-within:border-[#0b7a53] focus-within:ring-2 focus-within:ring-[#c9f0a0]">
                <span className="text-[#0b7a53]">
                  <MailIcon />
                </span>
                <input
                  ref={mode === "login" ? firstInputRef : undefined}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  maxLength={120}
                  className="min-w-0 flex-1 bg-transparent text-base font-black text-[#18261e] outline-none"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </label>

            <label className="mt-4 grid gap-2 text-sm font-black text-[#465246]">
              Password
              <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-[#c9e9b5] bg-[#fff8ea] px-4 focus-within:border-[#0b7a53] focus-within:ring-2 focus-within:ring-[#c9f0a0]">
                <span className="text-[#0b7a53]">
                  <LockIcon />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  maxLength={120}
                  className="min-w-0 flex-1 bg-transparent text-base font-black text-[#18261e] outline-none"
                  placeholder="6 characters minimum"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>
            </label>

            {error ? (
              <p role="alert" className="mt-3 rounded-2xl border border-[#f0d2c7] bg-[#fff0ea] p-3 text-sm font-bold text-[#9b392f]">
                {error}
              </p>
            ) : null}

            {success ? (
              <p role="status" className="mt-3 rounded-2xl border border-[#c9e9b5] bg-[#edfbdc] p-3 text-sm font-bold text-[#0b6b47]">
                {success}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isLoggingIn || !!success}
              className="ll-interactive mt-5 min-h-14 w-full rounded-2xl bg-[#0b7a53] px-5 text-base font-black text-white shadow-[0_14px_32px_rgba(11,122,83,0.24)] hover:bg-[#075f41] focus:outline-none focus:ring-2 focus:ring-[#ffb84d] disabled:opacity-60"
            >
              {isLoggingIn ? "Working..." : actionLabel}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="ll-interactive mt-3 min-h-12 w-full rounded-2xl bg-[#fff8ea] text-sm font-black text-[#18261e] ring-1 ring-[#f0d7ad] hover:bg-[#ffefc2] focus:outline-none focus:ring-2 focus:ring-[#ffb84d]"
            >
              Not now
            </button>
          </form>
        </div>
      </section>
    </div>,
    document.body,
  );
}
