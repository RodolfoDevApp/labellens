import type { Hono } from "hono";
import {
  authConfirmationSchema,
  authPasswordResetConfirmSchema,
  authPasswordResetStartSchema,
  authSessionSchema,
} from "@labellens/contracts";
import { createHash } from "node:crypto";
import {
  createDevAccessToken,
  createRuntimeAuthSessionVerifier,
} from "@labellens/infrastructure";
import { problemDetails, type ServiceBindings } from "@labellens/service-support";
import type { AuthServiceConfig } from "../../config/auth-service-config.js";
import {
  confirmForgotUserPassword,
  confirmUserSignUp,
  decodeJwtClaims,
  forgotUserPassword,
  initiateUserPasswordAuth,
  signUpUser,
  type CognitoAuthResult,
} from "../../infrastructure/cognito/cognito-user-pool-client.js";

export function registerAuthRoutes(app: Hono<ServiceBindings>, config: AuthServiceConfig): void {
  const authSessionVerifier = createRuntimeAuthSessionVerifier({
    cognitoUserPoolId: config.cognitoUserPoolId,
    cognitoUserPoolClientId: config.cognitoUserPoolClientId,
  });

  app.post("/api/v1/auth/session", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = authSessionSchema.safeParse(body);
    const correlationId = c.get("correlationId");

    if (!parsed.success) {
      return c.json(
        problemDetails({
          title: "Invalid session request",
          status: 400,
          detail: "email must be valid, password must contain at least 8 characters and displayName is required for registration.",
          code: "auth.session.invalid_request",
          correlationId,
          details: parsed.error.issues,
        }),
        400,
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const displayName = parsed.data.displayName?.trim() || email.split("@")[0] || "LabelLens user";

    if (parsed.data.mode === "register" && displayName.length === 0) {
      return c.json(
        problemDetails({
          title: "Invalid registration request",
          status: 400,
          detail: "displayName is required when registering a new account.",
          code: "auth.session.display_name_required",
          correlationId,
        }),
        400,
      );
    }

    if (config.allowDemoLogin || !config.cognitoUserPoolClientId) {
      const user = {
        userId: `user-${createHash("sha256").update(email).digest("hex").slice(0, 24)}`,
        displayName,
      };

      return c.json({
        accessToken: createDevAccessToken(user),
        tokenType: "Bearer",
        authMode: "demo",
        user,
      });
    }

    try {
      if (parsed.data.mode === "register") {
        const signUpResult = await signUpUser({
          region: config.awsRegion,
          clientId: config.cognitoUserPoolClientId,
          email,
          password: parsed.data.password,
          displayName,
        });

        if (!signUpResult.userConfirmed) {
          return c.json(
            {
              nextStep: "confirm",
              email,
              deliveryDestination: signUpResult.codeDeliveryDestination,
              deliveryMedium: signUpResult.codeDeliveryMedium,
              message: "Account created. Enter the confirmation code sent by Cognito to finish sign-in.",
            },
            202,
          );
        }
      }

      const authResult = await initiateUserPasswordAuth({
        region: config.awsRegion,
        clientId: config.cognitoUserPoolClientId,
        email,
        password: parsed.data.password,
      });

      return c.json({
        accessToken: authResult.accessToken,
        tokenType: authResult.tokenType,
        authMode: "cognito",
        user: getUserFromAuthResult(authResult, displayName),
      });
    } catch (error) {
      return c.json(
        problemDetails({
          title: "Authentication failed",
          status: 400,
          detail: error instanceof Error ? error.message : "Authentication failed.",
          code: "auth.session.failed",
          correlationId,
        }),
        400,
      );
    }
  });

  app.post("/api/v1/auth/confirm", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = authConfirmationSchema.safeParse(body);
    const correlationId = c.get("correlationId");

    if (!parsed.success) {
      return c.json(
        problemDetails({
          title: "Invalid confirmation request",
          status: 400,
          detail: "email, password and confirmationCode are required.",
          code: "auth.confirm.invalid_request",
          correlationId,
          details: parsed.error.issues,
        }),
        400,
      );
    }

    if (config.allowDemoLogin || !config.cognitoUserPoolClientId) {
      return c.json(
        problemDetails({
          title: "Confirmation unavailable",
          status: 409,
          detail: "Account confirmation is only available when Cognito authentication is enabled.",
          code: "auth.confirm.unavailable",
          correlationId,
        }),
        409,
      );
    }

    try {
      await confirmUserSignUp({
        region: config.awsRegion,
        clientId: config.cognitoUserPoolClientId,
        email: parsed.data.email.trim().toLowerCase(),
        confirmationCode: parsed.data.confirmationCode.trim(),
      });

      const email = parsed.data.email.trim().toLowerCase();
      const authResult = await initiateUserPasswordAuth({
        region: config.awsRegion,
        clientId: config.cognitoUserPoolClientId,
        email,
        password: parsed.data.password,
      });

      return c.json({
        accessToken: authResult.accessToken,
        tokenType: authResult.tokenType,
        authMode: "cognito",
        user: getUserFromAuthResult(authResult, getFallbackDisplayName(email)),
      });
    } catch (error) {
      return c.json(
        problemDetails({
          title: "Confirmation failed",
          status: 400,
          detail: error instanceof Error ? error.message : "Confirmation failed.",
          code: "auth.confirm.failed",
          correlationId,
        }),
        400,
      );
    }
  });

  app.post("/api/v1/auth/password/forgot", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = authPasswordResetStartSchema.safeParse(body);
    const correlationId = c.get("correlationId");

    if (!parsed.success) {
      return c.json(
        problemDetails({
          title: "Invalid password reset request",
          status: 400,
          detail: "email is required.",
          code: "auth.password_reset.invalid_request",
          correlationId,
          details: parsed.error.issues,
        }),
        400,
      );
    }

    if (config.allowDemoLogin || !config.cognitoUserPoolClientId) {
      return c.json(
        problemDetails({
          title: "Password reset unavailable",
          status: 409,
          detail: "Password reset is only available when Cognito authentication is enabled.",
          code: "auth.password_reset.unavailable",
          correlationId,
        }),
        409,
      );
    }

    try {
      const email = parsed.data.email.trim().toLowerCase();
      const result = await forgotUserPassword({
        region: config.awsRegion,
        clientId: config.cognitoUserPoolClientId,
        email,
      });

      return c.json({
        nextStep: "reset-password",
        email,
        deliveryDestination: result.codeDeliveryDestination,
        deliveryMedium: result.codeDeliveryMedium,
        message: "We sent a recovery code. Enter it below and choose a new password.",
      });
    } catch (error) {
      return c.json(
        problemDetails({
          title: "Password reset failed",
          status: 400,
          detail: error instanceof Error ? error.message : "Password reset failed.",
          code: "auth.password_reset.failed",
          correlationId,
        }),
        400,
      );
    }
  });

  app.post("/api/v1/auth/password/reset", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = authPasswordResetConfirmSchema.safeParse(body);
    const correlationId = c.get("correlationId");

    if (!parsed.success) {
      return c.json(
        problemDetails({
          title: "Invalid password update request",
          status: 400,
          detail: "email, confirmationCode and password are required.",
          code: "auth.password_update.invalid_request",
          correlationId,
          details: parsed.error.issues,
        }),
        400,
      );
    }

    if (config.allowDemoLogin || !config.cognitoUserPoolClientId) {
      return c.json(
        problemDetails({
          title: "Password update unavailable",
          status: 409,
          detail: "Password update is only available when Cognito authentication is enabled.",
          code: "auth.password_update.unavailable",
          correlationId,
        }),
        409,
      );
    }

    try {
      await confirmForgotUserPassword({
        region: config.awsRegion,
        clientId: config.cognitoUserPoolClientId,
        email: parsed.data.email.trim().toLowerCase(),
        confirmationCode: parsed.data.confirmationCode.trim(),
        password: parsed.data.password,
      });

      return c.json({
        message: "Password updated. You can sign in with the new password now.",
      });
    } catch (error) {
      return c.json(
        problemDetails({
          title: "Password update failed",
          status: 400,
          detail: error instanceof Error ? error.message : "Password update failed.",
          code: "auth.password_update.failed",
          correlationId,
        }),
        400,
      );
    }
  });

  app.get("/api/v1/auth/me", async (c) => {
    const user = await authSessionVerifier.verify(c.req.header("Authorization"));

    if (!user) {
      return c.json(
        problemDetails({
          title: "Authentication required",
          status: 401,
          detail: "Sign in before reading the current user session.",
          code: "auth.required",
          correlationId: c.get("correlationId"),
        }),
        401,
      );
    }

    return c.json({ user });
  });
}

function getUserFromAuthResult(authResult: CognitoAuthResult, fallbackDisplayName: string) {
  const accessTokenClaims = decodeJwtClaims(authResult.accessToken);
  const idTokenClaims: Record<string, unknown> = authResult.idToken ? decodeJwtClaims(authResult.idToken) : {};
  const userId =
    getClaim(idTokenClaims, "sub") ??
    getClaim(accessTokenClaims, "sub") ??
    `user-${createHash("sha256").update(authResult.accessToken).digest("hex").slice(0, 24)}`;
  const displayName =
    getFriendlyClaim(idTokenClaims, "name") ??
    getFriendlyClaim(idTokenClaims, "preferred_username") ??
    normalizeDisplayName(fallbackDisplayName) ??
    getFriendlyEmailName(idTokenClaims) ??
    getFriendlyEmailName(accessTokenClaims) ??
    getFriendlyClaim(accessTokenClaims, "preferred_username") ??
    getFriendlyClaim(accessTokenClaims, "username") ??
    getFriendlyClaim(accessTokenClaims, "cognito:username") ??
    "LabelLens user";

  return {
    userId,
    displayName,
  };
}

function getFallbackDisplayName(email: string): string {
  return normalizeDisplayName(email.split("@")[0]) ?? "LabelLens user";
}

function getClaim(payload: Record<string, unknown>, claimName: string): string | undefined {
  const value = payload[claimName];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function getFriendlyClaim(payload: Record<string, unknown>, claimName: string): string | undefined {
  return normalizeDisplayName(getClaim(payload, claimName));
}

function getFriendlyEmailName(payload: Record<string, unknown>): string | undefined {
  const email = getClaim(payload, "email");
  return email ? getFallbackDisplayName(email) : undefined;
}

function normalizeDisplayName(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || /^labellens-[a-f0-9]{40}$/i.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}
