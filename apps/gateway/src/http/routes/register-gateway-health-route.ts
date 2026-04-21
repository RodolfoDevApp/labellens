import type { Hono } from "hono";

export function registerGatewayHealthRoute(app: Hono): void {
  app.get("/gateway/health", (c) =>
    c.json({
      status: "ok",
      service: "gateway",
      timestamp: new Date().toISOString(),
    }),
  );
}
