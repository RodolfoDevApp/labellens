import type { Hono } from "hono";

export type ApiHealthRouteOptions = {
  storageDriver: string;
};

export function registerApiHealthRoute(app: Hono, options: ApiHealthRouteOptions): void {
  app.get("/api/v1/health", (c) =>
    c.json({
      status: "ok",
      service: "gateway",
      storageDriver: options.storageDriver,
    }),
  );
}
