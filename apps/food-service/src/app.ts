import { Hono } from "hono";
import { logger } from "hono/logger";
import { correlationIdMiddleware, type ServiceBindings } from "@labellens/service-support";
import { createFoodServiceDependencies } from "./composition/create-food-service-dependencies.js";
import type { FoodServiceDependencies } from "./composition/food-service-dependencies.js";
import { registerFoodRoutes } from "./http/routes/register-food-routes.js";

export function createFoodServiceApp(
  dependencies: FoodServiceDependencies = createFoodServiceDependencies(),
) {
  const app = new Hono<ServiceBindings>();

  app.use("*", logger());
  app.use("*", correlationIdMiddleware);
  app.get("/service/health", (c) => c.json({ status: "ok", service: "food-service" }));

  registerFoodRoutes(app, dependencies);

  return app;
}

export const app = createFoodServiceApp();
