import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { AppDependencies } from "./composition/app-dependencies.js";
import { createAppDependencies } from "./composition/create-app-dependencies.js";
import type { AppBindings } from "./http/app-bindings.js";
import { correlationIdMiddleware } from "./http/middleware/correlation-id-middleware.js";
import { registerAuthRoutes } from "./http/routes/register-auth-routes.js";
import { registerFavoriteRoutes } from "./http/routes/register-favorite-routes.js";
import { registerFoodRoutes } from "./http/routes/register-food-routes.js";
import { registerHealthRoute } from "./http/routes/register-health-route.js";
import { registerMenuRoutes } from "./http/routes/register-menu-routes.js";
import { registerProductRoutes } from "./http/routes/register-product-routes.js";

export function createApp(dependencies: AppDependencies = createAppDependencies()) {
  const app = new Hono<AppBindings>();

  app.use("*", logger());
  app.use(
    "*",
    cors({
      origin: ["http://localhost:3000"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "x-correlation-id"],
    }),
  );
  app.use("*", correlationIdMiddleware);

  registerAuthRoutes(app, dependencies);
  registerHealthRoute(app);
  registerFoodRoutes(app);
  registerProductRoutes(app);
  registerMenuRoutes(app, dependencies);
  registerFavoriteRoutes(app, dependencies);

  return app;
}

export const app = createApp();
