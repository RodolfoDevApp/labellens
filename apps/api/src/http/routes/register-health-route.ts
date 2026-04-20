import type { Hono } from "hono";
import { appConfig } from "../../config/app-config.js";
import type { AppBindings } from "../app-bindings.js";

export function registerHealthRoute(app: Hono<AppBindings>): void {
  app.get("/api/v1/health", (c) => {
    return c.json({
      status: "ok",
      service: "labellens-api",
      time: new Date().toISOString(),
      usdaMode: appConfig.usdaApiKey ? "live" : "fixture",
      openFoodFactsMode: appConfig.openFoodFactsMode === "live" ? "live" : "fixture",
      storageDriver: appConfig.storageDriver,
    });
  });
}
