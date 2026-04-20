import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../app-bindings.js";

export const correlationIdMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
  const incomingCorrelationId = c.req.header("x-correlation-id");
  const correlationId = incomingCorrelationId ?? crypto.randomUUID();

  c.header("x-correlation-id", correlationId);
  c.set("correlationId", correlationId);

  await next();
};
