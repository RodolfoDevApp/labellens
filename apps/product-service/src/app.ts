import { Hono } from "hono";
import { logger } from "hono/logger";
import { correlationIdMiddleware, type ServiceBindings } from "@labellens/service-support";
import { createProductServiceDependencies } from "./composition/create-product-service-dependencies.js";
import type { ProductServiceDependencies } from "./composition/product-service-dependencies.js";
import { registerProductRoutes } from "./http/routes/register-product-routes.js";

export function createProductServiceApp(
  dependencies: ProductServiceDependencies = createProductServiceDependencies(),
) {
  const app = new Hono<ServiceBindings>();

  app.use("*", logger());
  app.use("*", correlationIdMiddleware);
  app.get("/service/health", (c) => c.json({ status: "ok", service: "product-service" }));

  registerProductRoutes(app, dependencies);

  return app;
}

export const app = createProductServiceApp();
