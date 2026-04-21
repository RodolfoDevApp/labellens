import type { MiddlewareHandler } from "hono";

declare module "hono" {
  interface ContextVariableMap {
    correlationId: string;
  }
}

export const correlationIdMiddleware: MiddlewareHandler = async (c, next) => {
  const incoming = c.req.header("x-correlation-id");
  const correlationId = incoming && incoming.trim().length > 0 ? incoming : crypto.randomUUID();

  c.set("correlationId", correlationId);
  c.header("x-correlation-id", correlationId);

  await next();
};
