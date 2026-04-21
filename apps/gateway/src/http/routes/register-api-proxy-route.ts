import type { Hono } from "hono";
import type { GatewayServiceUrls } from "../../config/gateway-service-urls.js";
import { proxyApiRequest } from "../proxy/proxy-api-request.js";
import { resolveUpstreamService } from "../proxy/resolve-upstream-service.js";

export type RegisterApiProxyRouteOptions = {
  serviceUrls: GatewayServiceUrls;
  fetchImpl?: typeof fetch;
};

export function registerApiProxyRoute(app: Hono, options: RegisterApiProxyRouteOptions): void {
  app.all("/api/v1/*", (c) => {
    const pathname = new URL(c.req.url).pathname;
    const upstreamBaseUrl = resolveUpstreamService(pathname, options.serviceUrls);

    if (!upstreamBaseUrl) {
      return c.json(
        {
          type: "about:blank",
          title: "Gateway route not found",
          status: 404,
          detail: "No internal service route is registered for this API path.",
          code: "gateway.route_not_found",
          correlationId: c.get("correlationId"),
        },
        404,
      );
    }

    const proxyOptions = options.fetchImpl
      ? { upstreamBaseUrl, fetchImpl: options.fetchImpl }
      : { upstreamBaseUrl };

    return proxyApiRequest(c, proxyOptions);
  });
}
