import type { Hono } from "hono";
import { proxyApiRequest, type ProxyApiRequestOptions } from "../proxy/proxy-api-request.js";

export function registerApiProxyRoute(app: Hono, options: ProxyApiRequestOptions): void {
  app.all("/api/v1/*", (c) => proxyApiRequest(c, options));
}
