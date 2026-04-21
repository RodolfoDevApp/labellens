import type { Hono } from "hono";
import { demoLoginSchema } from "@labellens/contracts";
import {
  createDevAccessToken,
  DevAuthSessionVerifier,
} from "@labellens/infrastructure";
import { problemDetails, type ServiceBindings } from "@labellens/service-support";

const authSessionVerifier = new DevAuthSessionVerifier();

export function registerAuthRoutes(app: Hono<ServiceBindings>): void {
  app.post("/api/v1/auth/demo-login", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = demoLoginSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        problemDetails({
          title: "Invalid demo login request",
          status: 400,
          detail: "displayName must be a string when provided.",
          code: "auth.demo_login.invalid_request",
          correlationId: c.get("correlationId"),
          details: parsed.error.issues,
        }),
        400,
      );
    }

    const user = {
      userId: "demo-user",
      displayName: parsed.data.displayName?.trim() || "Demo user",
    };

    return c.json({
      accessToken: createDevAccessToken(user),
      tokenType: "Bearer",
      user,
    });
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
