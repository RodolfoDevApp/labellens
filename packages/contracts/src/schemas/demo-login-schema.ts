import { z } from "zod";

export const authSessionSchema = z.object({
  mode: z.enum(["login", "register"]),
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(60).optional(),
});

export const authConfirmationSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(128),
  confirmationCode: z.string().trim().min(3).max(32),
});

export const authPasswordResetStartSchema = z.object({
  email: z.string().trim().email().max(120),
});

export const authPasswordResetConfirmSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(128),
  confirmationCode: z.string().trim().min(3).max(32),
});

export type AuthSessionRequestContract = z.infer<typeof authSessionSchema>;
export type AuthConfirmationRequestContract = z.infer<typeof authConfirmationSchema>;
export type AuthPasswordResetStartRequestContract = z.infer<typeof authPasswordResetStartSchema>;
export type AuthPasswordResetConfirmRequestContract = z.infer<typeof authPasswordResetConfirmSchema>;

// Backward-compatible aliases kept to avoid breaking internal imports while the public route remains /auth/session.
export const demoLoginSchema = authSessionSchema;
export type DemoLoginRequestContract = AuthSessionRequestContract;
