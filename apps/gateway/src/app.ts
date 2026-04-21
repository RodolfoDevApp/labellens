import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { GatewayServiceUrls } from "./config/gateway-service-urls.js";
import { correlationIdMiddleware } from "./http/middleware/correlation-id-middleware.js";
import { registerApiHealthRoute } from "./http/routes/register-api-health-route.js";
import { registerApiProxyRoute } from "./http/routes/register-api-proxy-route.js";
import { registerGatewayHealthRoute } from "./http/routes/register-gateway-health-route.js";

export type CreateGatewayAppOptions = {
  allowedOrigins: string[];
  serviceUrls: GatewayServiceUrls;
  storageDriver: string;
  fetchImpl?: typeof fetch;
};

export function createGatewayApp(options: CreateGatewayAppOptions) {
  const app = new Hono();

  app.use("*", logger());
  app.use(
    "*",
    cors({
      origin: options.allowedOrigins,
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "x-correlation-id"],
    }),
  );
  app.use("*", correlationIdMiddleware);

  registerGatewayHealthRoute(app);
  registerApiHealthRoute(app, { storageDriver: options.storageDriver });

  const proxyOptions = options.fetchImpl
    ? {
        serviceUrls: options.serviceUrls,
        fetchImpl: options.fetchImpl,
      }
    : {
        serviceUrls: options.serviceUrls,
      };

  registerApiProxyRoute(app, proxyOptions);

  return app;
}
