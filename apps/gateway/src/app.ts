import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { correlationIdMiddleware } from "./http/middleware/correlation-id-middleware.js";
import { registerApiProxyRoute } from "./http/routes/register-api-proxy-route.js";
import { registerGatewayHealthRoute } from "./http/routes/register-gateway-health-route.js";

export type CreateGatewayAppOptions = {
  apiInternalBaseUrl: string;
  allowedOrigins: string[];
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

  const proxyOptions = options.fetchImpl
    ? {
        apiInternalBaseUrl: options.apiInternalBaseUrl,
        fetchImpl: options.fetchImpl,
      }
    : {
        apiInternalBaseUrl: options.apiInternalBaseUrl,
      };

  registerApiProxyRoute(app, proxyOptions);

  return app;
}