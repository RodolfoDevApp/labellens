import type { GatewayServiceUrls } from "../../config/gateway-service-urls.js";

export function resolveUpstreamService(pathname: string, serviceUrls: GatewayServiceUrls): string | null {
  if (pathname.startsWith("/api/v1/auth/")) {
    return serviceUrls.auth;
  }

  if (pathname.startsWith("/api/v1/favorites")) {
    return serviceUrls.favorites;
  }

  if (pathname.startsWith("/api/v1/foods/")) {
    return serviceUrls.food;
  }

  if (pathname.startsWith("/api/v1/menus")) {
    return serviceUrls.menu;
  }

  if (pathname.startsWith("/api/v1/products/")) {
    return serviceUrls.product;
  }

  return null;
}
