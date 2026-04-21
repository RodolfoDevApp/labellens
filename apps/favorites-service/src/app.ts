import { Hono } from "hono";
import { logger } from "hono/logger";
import { correlationIdMiddleware, type ServiceBindings } from "@labellens/service-support";
import { createFavoritesServiceDependencies } from "./composition/create-favorites-service-dependencies.js";
import type { FavoritesServiceDependencies } from "./composition/favorites-service-dependencies.js";
import { registerFavoriteRoutes } from "./http/routes/register-favorite-routes.js";

export function createFavoritesServiceApp(
  dependencies: FavoritesServiceDependencies = createFavoritesServiceDependencies(),
) {
  const app = new Hono<ServiceBindings>();

  app.use("*", logger());
  app.use("*", correlationIdMiddleware);
  app.get("/service/health", (c) => c.json({ status: "ok", service: "favorites-service" }));

  registerFavoriteRoutes(app, dependencies);

  return app;
}

export const app = createFavoritesServiceApp();
