import { Hono } from "hono";
import { logger } from "hono/logger";
import { correlationIdMiddleware, type ServiceBindings } from "@labellens/service-support";
import { readAuthServiceConfig } from "./config/auth-service-config.js";
import { registerAuthRoutes } from "./http/routes/register-auth-routes.js";

export function createAuthServiceApp() {
  const app = new Hono<ServiceBindings>();
  const config = readAuthServiceConfig();

  app.use("*", logger());
  app.use("*", correlationIdMiddleware);
  app.get("/service/health", (c) => c.json({ status: "ok", service: "auth-service" }));

  registerAuthRoutes(app, config);

  return app;
}

export const app = createAuthServiceApp();
