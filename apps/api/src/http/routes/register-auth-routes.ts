import type { Hono } from "hono";
import type { AuthUser } from "@labellens/application";
import { createDevAccessToken } from "../../auth/dev-auth.js";
import type { AppDependencies } from "../../composition/app-dependencies.js";
import { problemDetails } from "../../shared/problem-details.js";
import type { AppBindings } from "../app-bindings.js";
import { requireAuthUser } from "../auth/require-auth-user.js";
import { demoLoginSchema } from "../schemas/demo-login-schema.js";

export function registerAuthRoutes(app: Hono<AppBindings>, dependencies: AppDependencies): void {
  app.post("/api/v1/auth/demo-login", async (c) => {
    const correlationId = c.get("correlationId");
    const body = await c.req.json().catch(() => ({}));
    const parsed = demoLoginSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        problemDetails({
          title: "Invalid login request",
          status: 400,
          detail: "displayName must be 1 to 60 characters when provided.",
          code: "auth.demo_login.invalid_request",
          correlationId,
          details: parsed.error.issues,
        }),
        400,
      );
    }

    const user: AuthUser = {
      userId: "demo-user",
      displayName: parsed.data.displayName ?? "Demo user",
    };

    return c.json({
      tokenType: "Bearer",
      accessToken: createDevAccessToken(user),
      user,
    });
  });

  app.get("/api/v1/auth/me", async (c) => {
    const correlationId = c.get("correlationId");
    const auth = await requireAuthUser(dependencies, c.req.header("Authorization"), correlationId);

    if (!auth.ok) {
      return auth.response;
    }

    return c.json({ user: auth.user });
  });
}
