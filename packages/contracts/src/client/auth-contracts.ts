import type {
  AuthConfirmationRequestContract,
  AuthPasswordResetConfirmRequestContract,
  AuthPasswordResetStartRequestContract,
  AuthSessionRequestContract,
} from "../schemas/demo-login-schema.js";

export type AuthUserContract = {
  userId: string;
  displayName: string;
};

export type AuthSessionApiRequestContract = AuthSessionRequestContract;
export type AuthConfirmationApiRequestContract = AuthConfirmationRequestContract;
export type AuthPasswordResetStartApiRequestContract = AuthPasswordResetStartRequestContract;
export type AuthPasswordResetConfirmApiRequestContract = AuthPasswordResetConfirmRequestContract;

export type AuthSessionSuccessResponseContract = {
  tokenType: "Bearer";
  accessToken: string;
  user: AuthUserContract;
  authMode: "demo" | "cognito";
};

export type AuthConfirmationRequiredResponseContract = {
  nextStep: "confirm";
  email: string;
  deliveryDestination?: string;
  deliveryMedium?: string;
  message: string;
};

export type AuthPasswordResetStartResponseContract = {
  nextStep: "reset-password";
  email: string;
  deliveryDestination?: string;
  deliveryMedium?: string;
  message: string;
};

export type AuthPasswordResetConfirmResponseContract = {
  message: string;
};

export type AuthSessionResponseContract =
  | AuthSessionSuccessResponseContract
  | AuthConfirmationRequiredResponseContract;

export type CurrentUserResponseContract = {
  user: AuthUserContract;
};

// Backward-compatible aliases kept while the repository converges on the new naming.
export type DemoLoginApiRequestContract = AuthSessionApiRequestContract;
export type DemoLoginResponseContract = AuthSessionResponseContract;
