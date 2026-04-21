import { randomUUID } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import type { ServiceBindings } from "../app-bindings.js";

export const correlationIdMiddleware: MiddlewareHandler<ServiceBindings> = async (c, next) => {
  const incomingCorrelationId = c.req.header("x-correlation-id");
  const correlationId = incomingCorrelationId?.trim() || randomUUID();

  c.set("correlationId", correlationId);
  await next();
  c.header("x-correlation-id", correlationId);
};
