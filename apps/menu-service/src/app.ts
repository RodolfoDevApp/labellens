import { Hono } from "hono";
import { logger } from "hono/logger";
import { correlationIdMiddleware, type ServiceBindings } from "@labellens/service-support";
import { createMenuServiceDependencies } from "./composition/create-menu-service-dependencies.js";
import type { MenuServiceDependencies } from "./composition/menu-service-dependencies.js";
import { registerMenuRoutes } from "./http/routes/register-menu-routes.js";

export function createMenuServiceApp(
  dependencies: MenuServiceDependencies = createMenuServiceDependencies(),
) {
  const app = new Hono<ServiceBindings>();

  app.use("*", logger());
  app.use("*", correlationIdMiddleware);
  app.get("/service/health", (c) => c.json({ status: "ok", service: "menu-service" }));

  registerMenuRoutes(app, dependencies);

  return app;
}

export const app = createMenuServiceApp();
