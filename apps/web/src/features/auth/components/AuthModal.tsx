"use client";

import { createPortal } from "react-dom";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  type AuthSession,
  type PendingConfirmation,
  useAuthSession,
} from "@/features/auth/hooks/useAuthSession";

const PASSWORD_POLICY_HELP_TEXT = "Use at least 8 characters and one symbol. Valid symbols include !, @, #, $, %, &, *, _, -, +, =, . or ?. Example: Abc123123_";

type AuthModalMode = "login" | "register";
type RecoveryStep = "idle" | "request" | "confirm";

type FieldName =
  | "displayName"
  | "email"
  | "password"
  | "confirmPassword"
  | "confirmationCode"
  | "recoveryCode"
  | "recoveryPassword"
  | "recoveryConfirmPassword";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  initialMode?: AuthModalMode;
  onAuthenticated?: (session: AuthSession) => void | Promise<void>;
};

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
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
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ isVisible }: { isVisible: boolean }) {
  return isVisible ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.7 5.1A11 11 0 0 1 12 5c6.2 0 10 7 10 7a18 18 0 0 1-3 3.8" />
      <path d="M6.5 6.6C3.8 8.2 2 12 2 12s3.8 7 10 7a10.3 10.3 0 0 0 4-.8" />
      <path d="M9.9 9.8A3 3 0 0 0 14.2 14" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function FieldError({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }

  return <span className="text-xs font-bold leading-4 text-[#b4493b]">{message}</span>;
}

function fieldFrameClass(hasError: boolean) {
  return `flex min-h-12 items-center gap-3 rounded-2xl border bg-[#fcfdfb] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition ${
    hasError
      ? "border-[#e7a7a1] ring-2 ring-[#f4cfca]"
      : "border-[#cddccc] ring-1 ring-[#edf3ea] focus-within:border-[#4a9776] focus-within:ring-[#cbe4d8]"
  }`;
}

function getDisplayNameError(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) {
    return "Name is required.";
  }

  return normalized.length < 2 ? "Use at least 2 characters." : null;
}

function getEmailError(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) {
    return "Email is required.";
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? null : "Enter a valid email.";
}

function getLoginPasswordError(value: string): string | null {
  return value.length > 0 ? null : "Password is required.";
}

function getPolicyPasswordError(value: string): string | null {
  if (value.length < 8) {
    return "Use at least 8 characters.";
  }

  return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(value)
    ? null
    : "Add at least one symbol such as !, @, #, $, _, -, +, = or ?.";
}

function getConfirmPasswordError(password: string, confirmPassword: string): string | null {
  if (!confirmPassword.length) {
    return "Please repeat your password.";
  }

  return password === confirmPassword ? null : "Passwords do not match.";
}

function getConfirmationCodeError(value: string): string | null {
  return value.trim().length >= 3 ? null : "Confirmation code is required.";
}

function normalizeError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function isPendingConfirmation(value: AuthSession | PendingConfirmation): value is PendingConfirmation {
  return "nextStep" in value && value.nextStep === "confirm";
}

export function AuthModal({
  isOpen,
  onClose,
  title = "Open your account",
  description = "Sign in or create an account to keep menus and favorites under your identity.",
  initialMode = "login",
  onAuthenticated,
}: AuthModalProps) {
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>("idle");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState("");
  const [recoveryDestination, setRecoveryDestination] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [showRecoveryConfirmPassword, setShowRecoveryConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldName, true>>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    isLoggingIn,
    startSession,
    confirmSession,
    requestPasswordReset,
    confirmPasswordReset,
  } = useAuthSession();

  const isRecoveryActive = recoveryStep !== "idle";

  const normalizedEmail = email.trim().toLowerCase();

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<FieldName, string | null>> = {};

    if (isRecoveryActive) {
      errors.email = getEmailError(email);

      if (recoveryStep === "confirm") {
        errors.recoveryCode = getConfirmationCodeError(recoveryCode);
        errors.recoveryPassword = getPolicyPasswordError(recoveryPassword);
        errors.recoveryConfirmPassword = getConfirmPasswordError(recoveryPassword, recoveryConfirmPassword);
      }

      return errors;
    }

    if (pendingConfirmation) {
      errors.confirmationCode = getConfirmationCodeError(confirmationCode);
      return errors;
    }

    errors.email = getEmailError(email);
    errors.password = mode === "register" ? getPolicyPasswordError(password) : getLoginPasswordError(password);

    if (mode === "register") {
      errors.displayName = getDisplayNameError(displayName);
      errors.confirmPassword = getConfirmPasswordError(password, confirmPassword);
    }

    return errors;
  }, [confirmPassword, confirmationCode, displayName, email, isRecoveryActive, mode, password, pendingConfirmation, recoveryCode, recoveryConfirmPassword, recoveryPassword, recoveryStep]);

  const visibleErrors = useMemo(() => {
    const next: Partial<Record<FieldName, string | null>> = {};
    const shouldShow = (field: FieldName) => hasSubmitted || touched[field];

    (Object.keys(fieldErrors) as FieldName[]).forEach((field) => {
      next[field] = shouldShow(field) ? fieldErrors[field] ?? null : null;
    });

    return next;
  }, [fieldErrors, hasSubmitted, touched]);

  const isFormValid = useMemo(() => {
    const activeFields: FieldName[] = isRecoveryActive
      ? recoveryStep === "request"
        ? ["email"]
        : ["email", "recoveryCode", "recoveryPassword", "recoveryConfirmPassword"]
      : pendingConfirmation
        ? ["confirmationCode"]
        : mode === "register"
          ? ["displayName", "email", "password", "confirmPassword"]
          : ["email", "password"];

    return activeFields.every((field) => !fieldErrors[field]);
  }, [fieldErrors, isRecoveryActive, mode, pendingConfirmation, recoveryStep]);

  const actionLabel = isRecoveryActive
    ? recoveryStep === "request"
      ? "Send recovery code"
      : "Reset password"
    : pendingConfirmation
      ? "Confirm account"
      : mode === "register"
        ? onAuthenticated
          ? "Register and save"
          : "Register"
        : onAuthenticated
          ? "Login and save"
          : "Login";

  const modalTitle = isRecoveryActive
    ? recoveryStep === "request"
      ? "Recover your password"
      : "Choose a new password"
    : title;

  const modalDescription = isRecoveryActive
    ? recoveryStep === "request"
      ? "Enter your account email and we will send a recovery code."
      : "Enter the code from your email and set a new password that matches the current policy."
    : description;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setMode(initialMode);
    setPendingConfirmation(null);
    setRecoveryStep("idle");
    setRecoveryCode("");
    setRecoveryPassword("");
    setRecoveryConfirmPassword("");
    setRecoveryDestination(null);
    setTouched({});
    setHasSubmitted(false);
    setError(null);
    setSuccess(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowRecoveryPassword(false);
    setShowRecoveryConfirmPassword(false);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      if (firstInputRef.current) {
        firstInputRef.current.focus();
        return;
      }

      closeButtonRef.current?.focus();
    }, 0);

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

  function markTouched(field: FieldName) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function resetTransientFeedback() {
    setTouched({});
    setHasSubmitted(false);
    setError(null);
    setSuccess(null);
  }

  function switchMode(nextMode: AuthModalMode) {
    setMode(nextMode);
    setPendingConfirmation(null);
    setRecoveryStep("idle");
    setConfirmationCode("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    resetTransientFeedback();
  }

  function startRecoveryFlow() {
    setPendingConfirmation(null);
    setRecoveryStep("request");
    setRecoveryCode("");
    setRecoveryPassword("");
    setRecoveryConfirmPassword("");
    setRecoveryDestination(null);
    setShowRecoveryPassword(false);
    setShowRecoveryConfirmPassword(false);
    resetTransientFeedback();
  }

  function exitRecoveryFlow() {
    setRecoveryStep("idle");
    setRecoveryCode("");
    setRecoveryPassword("");
    setRecoveryConfirmPassword("");
    setRecoveryDestination(null);
    setShowRecoveryPassword(false);
    setShowRecoveryConfirmPassword(false);
    resetTransientFeedback();
  }

  function touchActiveFields() {
    if (isRecoveryActive) {
      setTouched(
        recoveryStep === "request"
          ? { email: true }
          : { email: true, recoveryCode: true, recoveryPassword: true, recoveryConfirmPassword: true },
      );
      return;
    }

    if (pendingConfirmation) {
      setTouched({ confirmationCode: true });
      return;
    }

    setTouched(
      mode === "register"
        ? { displayName: true, email: true, password: true, confirmPassword: true }
        : { email: true, password: true },
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);
    setError(null);
    setSuccess(null);

    if (!isFormValid) {
      touchActiveFields();
      setError("Fix the highlighted fields before continuing.");
      return;
    }

    if (isRecoveryActive) {
      try {
        if (recoveryStep === "request") {
          const result = await requestPasswordReset({ email: normalizedEmail });
          setRecoveryDestination(result.deliveryDestination ?? null);
          setRecoveryStep("confirm");
          setTouched({});
          setHasSubmitted(false);
          setSuccess(result.message);
          return;
        }

        const result = await confirmPasswordReset({
          email: normalizedEmail,
          confirmationCode: recoveryCode,
          password: recoveryPassword,
        });
        setPassword(recoveryPassword);
        setMode("login");
        setRecoveryStep("idle");
        setRecoveryCode("");
        setRecoveryPassword("");
        setRecoveryConfirmPassword("");
        setRecoveryDestination(null);
        setTouched({});
        setHasSubmitted(false);
        setSuccess(result.message);
      } catch (recoveryError) {
        setError(normalizeError(recoveryError));
      }

      return;
    }

    if (pendingConfirmation) {
      try {
        const session = await confirmSession({
          email: pendingConfirmation.email,
          password: pendingConfirmation.password,
          confirmationCode,
        });

        await onAuthenticated?.(session);
        setSuccess("Account confirmed.");
        window.setTimeout(onClose, 650);
      } catch (confirmError) {
        setError(normalizeError(confirmError));
      }

      return;
    }

    try {
      const result = await startSession({
        mode,
        email,
        password,
        ...(mode === "register" ? { displayName } : {}),
      });

      if (isPendingConfirmation(result)) {
        setPendingConfirmation(result);
        setTouched({});
        setHasSubmitted(false);
        setConfirmationCode("");
        setSuccess(result.message);
        return;
      }

      await onAuthenticated?.(result);
      setSuccess(mode === "register" ? "Account ready." : "Session ready.");
      window.setTimeout(onClose, 650);
    } catch (loginError) {
      if (loginError instanceof Error && loginError.message.toLowerCase().includes("not confirmed")) {
        setPendingConfirmation({
          nextStep: "confirm",
          email: normalizedEmail,
          password,
          message: loginError.message,
        });
        setTouched({});
        setHasSubmitted(false);
        setSuccess(loginError.message);
        return;
      }

      setError(normalizeError(loginError));
    }
  }

  if (!mounted || !isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#163328]/42 p-2 backdrop-blur-[4px] sm:items-center sm:p-4">
      <button type="button" aria-label="Close account modal" onClick={onClose} className="absolute inset-0 cursor-default" />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        aria-describedby="auth-modal-description"
        className="relative flex max-h-[min(calc(100dvh-0.75rem),780px)] w-full max-w-xl flex-col overflow-hidden rounded-[1.75rem] border border-[#d8e5da] bg-[#f8fbf7] shadow-[0_28px_80px_rgba(22,51,40,0.22)] sm:rounded-[2rem]"
      >
        <header className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-[#e2e8de] bg-[#f7f2ea]/96 px-4 py-4 backdrop-blur sm:px-5">
          <div className="min-w-0">
            <p className="text-[0.72rem] font-black uppercase tracking-[0.08em] text-[#2f7d5c]">Account</p>
            <h2 id="auth-modal-title" className="mt-1 text-[1.9rem] font-black leading-none tracking-tight text-[#183126] sm:text-[2.1rem]">{modalTitle}</h2>
            <p id="auth-modal-description" className="mt-2 max-w-md text-sm leading-6 text-[#5d6d62]">{modalDescription}</p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close account modal"
            className="ll-interactive flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d8e2d8] bg-[#fffdf9] text-2xl font-black leading-none text-[#243027] shadow-[0_10px_20px_rgba(33,57,45,0.1)] hover:bg-[#eef5f0] focus:outline-none focus:ring-2 focus:ring-[#96c6b2]"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <form noValidate onSubmit={onSubmit} className="rounded-[1.6rem] border border-[#dbe7da] bg-[#edf7e8] p-3.5 shadow-[0_14px_30px_rgba(54,88,67,0.08)] sm:p-5">
            {isRecoveryActive ? (
              <button
                type="button"
                onClick={exitRecoveryFlow}
                className="mb-3 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-black text-[#2f7d5c] hover:bg-[#dfeee4] focus:outline-none focus:ring-2 focus:ring-[#96c6b2]"
              >
                <BackIcon />
                <span>Back to login</span>
              </button>
            ) : null}

            {!pendingConfirmation && !isRecoveryActive ? (
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#dfeee4] p-1" role="tablist" aria-label="Account mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "login"}
                  onClick={() => switchMode("login")}
                  className={`min-h-12 rounded-xl text-sm font-black transition ${mode === "login" ? "bg-[#fffdf9] text-[#183126] shadow-sm" : "text-[#406353] hover:bg-[#eef5f0]"}`}
                >
                  Login
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "register"}
                  onClick={() => switchMode("register")}
                  className={`min-h-12 rounded-xl text-sm font-black transition ${mode === "register" ? "bg-[#fffdf9] text-[#183126] shadow-sm" : "text-[#406353] hover:bg-[#eef5f0]"}`}
                >
                  Register
                </button>
              </div>
            ) : null}

            {mode === "register" && !pendingConfirmation && !isRecoveryActive ? (
              <label className="mt-4 grid gap-2 text-sm font-black text-[#465246]">
                Name
                <div className={fieldFrameClass(!!visibleErrors.displayName)}>
                  <span className="text-[#2f7d5c]"><UserIcon /></span>
                  <input
                    ref={firstInputRef}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    onBlur={() => markTouched("displayName")}
                    maxLength={60}
                    aria-invalid={!!visibleErrors.displayName}
                    className="min-w-0 flex-1 bg-transparent text-base font-black text-[#183126] outline-none"
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>
                <FieldError message={visibleErrors.displayName} />
              </label>
            ) : null}

            <label className="mt-4 grid gap-2 text-sm font-black text-[#465246]">
              Email
              <div className={fieldFrameClass(!!visibleErrors.email)}>
                <span className="text-[#2f7d5c]"><MailIcon /></span>
                <input
                  ref={mode === "login" || pendingConfirmation || isRecoveryActive ? firstInputRef : undefined}
                  type="text"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => markTouched("email")}
                  aria-invalid={!!visibleErrors.email}
                  className="min-w-0 flex-1 bg-transparent text-base font-black text-[#183126] outline-none"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={!!pendingConfirmation || recoveryStep === "confirm"}
                />
              </div>
              <FieldError message={visibleErrors.email} />
            </label>

            {!pendingConfirmation && !isRecoveryActive ? (
              <label className="mt-4 grid gap-2 text-sm font-black text-[#465246]">
                Password
                <div className={fieldFrameClass(!!visibleErrors.password)}>
                  <span className="text-[#2f7d5c]"><LockIcon /></span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onBlur={() => markTouched("password")}
                    maxLength={128}
                    aria-invalid={!!visibleErrors.password}
                    aria-describedby={mode === "register" ? "auth-password-policy" : undefined}
                    className="ll-password-input min-w-0 flex-1 bg-transparent text-base font-black text-[#183126] outline-none"
                    placeholder={mode === "login" ? "Your password" : "Example: Abc123123!"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((current) => !current)}
                    className="rounded-full p-2 text-[#2f7d5c] hover:bg-[#dfeee4] focus:outline-none focus:ring-2 focus:ring-[#96c6b2]"
                  >
                    <EyeIcon isVisible={showPassword} />
                  </button>
                </div>
                <FieldError message={visibleErrors.password} />
                {mode === "register" ? (
                  <span id="auth-password-policy" className="text-xs font-bold leading-4 text-[#5d6d62]">
                    {PASSWORD_POLICY_HELP_TEXT}
                  </span>
                ) : null}
              </label>
            ) : null}

            {mode === "register" && !pendingConfirmation && !isRecoveryActive ? (
              <label className="mt-4 grid gap-2 text-sm font-black text-[#465246]">
                Confirm password
                <div className={fieldFrameClass(!!visibleErrors.confirmPassword)}>
                  <span className="text-[#2f7d5c]"><LockIcon /></span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    onBlur={() => markTouched("confirmPassword")}
                    maxLength={128}
                    aria-invalid={!!visibleErrors.confirmPassword}
                    className="ll-password-input min-w-0 flex-1 bg-transparent text-base font-black text-[#183126] outline-none"
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className="rounded-full p-2 text-[#2f7d5c] hover:bg-[#dfeee4] focus:outline-none focus:ring-2 focus:ring-[#96c6b2]"
                  >
                    <EyeIcon isVisible={showConfirmPassword} />
                  </button>
                </div>
                <FieldError message={visibleErrors.confirmPassword} />
              </label>
            ) : null}

            {pendingConfirmation ? (
              <label className="mt-4 grid gap-2 text-sm font-black text-[#465246]">
                Confirmation code
                <div className={fieldFrameClass(!!visibleErrors.confirmationCode)}>
                  <span className="text-[#2f7d5c]"><LockIcon /></span>
                  <input
                    value={confirmationCode}
                    onChange={(event) => setConfirmationCode(event.target.value)}
                    onBlur={() => markTouched("confirmationCode")}
                    maxLength={32}
                    aria-invalid={!!visibleErrors.confirmationCode}
                    className="min-w-0 flex-1 bg-transparent text-base font-black text-[#183126] outline-none"
                    placeholder="Enter the code from your email"
                    autoComplete="one-time-code"
                  />
                </div>
                <FieldError message={visibleErrors.confirmationCode} />
                {pendingConfirmation.deliveryDestination ? (
                  <span className="text-xs font-bold text-[#5d6d62]">Code destination: {pendingConfirmation.deliveryDestination}</span>
                ) : null}
              </label>
            ) : null}

            {isRecoveryActive && recoveryStep === "confirm" ? (
              <>
                <label className="mt-4 grid gap-2 text-sm font-black text-[#465246]">
                  Recovery code
                  <div className={fieldFrameClass(!!visibleErrors.recoveryCode)}>
                    <span className="text-[#2f7d5c]"><LockIcon /></span>
                    <input
                      value={recoveryCode}
                      onChange={(event) => setRecoveryCode(event.target.value)}
                      onBlur={() => markTouched("recoveryCode")}
                      maxLength={32}
                      aria-invalid={!!visibleErrors.recoveryCode}
                      className="min-w-0 flex-1 bg-transparent text-base font-black text-[#183126] outline-none"
                      placeholder="Enter the code from your email"
                      autoComplete="one-time-code"
                    />
                  </div>
                  <FieldError message={visibleErrors.recoveryCode} />
                  {recoveryDestination ? (
                    <span className="text-xs font-bold text-[#5d6d62]">Code destination: {recoveryDestination}</span>
                  ) : null}
                </label>

                <label className="mt-4 grid gap-2 text-sm font-black text-[#465246]">
                  New password
                  <div className={fieldFrameClass(!!visibleErrors.recoveryPassword)}>
                    <span className="text-[#2f7d5c]"><LockIcon /></span>
                    <input
                      type={showRecoveryPassword ? "text" : "password"}
                      value={recoveryPassword}
                      onChange={(event) => setRecoveryPassword(event.target.value)}
                      onBlur={() => markTouched("recoveryPassword")}
                      maxLength={128}
                      aria-invalid={!!visibleErrors.recoveryPassword}
                      aria-describedby="recovery-password-policy"
                      className="ll-password-input min-w-0 flex-1 bg-transparent text-base font-black text-[#183126] outline-none"
                      placeholder="Example: Abc123123!"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      aria-label={showRecoveryPassword ? "Hide new password" : "Show new password"}
                      onClick={() => setShowRecoveryPassword((current) => !current)}
                      className="rounded-full p-2 text-[#2f7d5c] hover:bg-[#dfeee4] focus:outline-none focus:ring-2 focus:ring-[#96c6b2]"
                    >
                      <EyeIcon isVisible={showRecoveryPassword} />
                    </button>
                  </div>
                  <FieldError message={visibleErrors.recoveryPassword} />
                  <span id="recovery-password-policy" className="text-xs font-bold leading-4 text-[#5d6d62]">
                    {PASSWORD_POLICY_HELP_TEXT}
                  </span>
                </label>

                <label className="mt-4 grid gap-2 text-sm font-black text-[#465246]">
                  Confirm new password
                  <div className={fieldFrameClass(!!visibleErrors.recoveryConfirmPassword)}>
                    <span className="text-[#2f7d5c]"><LockIcon /></span>
                    <input
                      type={showRecoveryConfirmPassword ? "text" : "password"}
                      value={recoveryConfirmPassword}
                      onChange={(event) => setRecoveryConfirmPassword(event.target.value)}
                      onBlur={() => markTouched("recoveryConfirmPassword")}
                      maxLength={128}
                      aria-invalid={!!visibleErrors.recoveryConfirmPassword}
                      className="ll-password-input min-w-0 flex-1 bg-transparent text-base font-black text-[#183126] outline-none"
                      placeholder="Repeat your new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      aria-label={showRecoveryConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      onClick={() => setShowRecoveryConfirmPassword((current) => !current)}
                      className="rounded-full p-2 text-[#2f7d5c] hover:bg-[#dfeee4] focus:outline-none focus:ring-2 focus:ring-[#96c6b2]"
                    >
                      <EyeIcon isVisible={showRecoveryConfirmPassword} />
                    </button>
                  </div>
                  <FieldError message={visibleErrors.recoveryConfirmPassword} />
                </label>
              </>
            ) : null}

            {!pendingConfirmation && !isRecoveryActive && mode === "login" ? (
              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={startRecoveryFlow}
                  className="text-sm font-black text-[#2f7d5c] underline decoration-[#96c6b2] underline-offset-4 hover:text-[#245f47] focus:outline-none focus:ring-2 focus:ring-[#96c6b2]"
                >
                  Forgot or change password?
                </button>
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="mt-3 rounded-2xl border border-[#efc8c2] bg-[#fff4f1] p-3 text-sm font-bold text-[#a64a3d]">{error}</p>
            ) : null}

            {success ? (
              <p role="status" className="mt-3 rounded-2xl border border-[#cfe2d5] bg-[#f4fbf6] p-3 text-sm font-bold text-[#2b7154]">{success}</p>
            ) : null}

            <button
              type="submit"
              disabled={isLoggingIn || !isFormValid}
              className="ll-interactive mt-5 min-h-14 w-full rounded-2xl bg-[#2f7d5c] px-5 text-base font-black text-white shadow-[0_14px_30px_rgba(47,125,92,0.24)] hover:bg-[#26684c] focus:outline-none focus:ring-2 focus:ring-[#96c6b2] disabled:cursor-not-allowed disabled:bg-[#9fc6b4] disabled:text-white/85 disabled:shadow-none"
            >
              {isLoggingIn ? "Working..." : actionLabel}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="ll-interactive mt-3 min-h-12 w-full rounded-2xl border border-[#dbe4d8] bg-[#fffdf9] text-sm font-black text-[#183126] hover:bg-[#f1f6f1] focus:outline-none focus:ring-2 focus:ring-[#96c6b2]"
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
