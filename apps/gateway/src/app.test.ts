import { describe, expect, it, vi } from "vitest";
import { createGatewayApp } from "./app.js";
import type { GatewayServiceUrls } from "./config/gateway-service-urls.js";

const serviceUrls: GatewayServiceUrls = {
  auth: "http://auth-service:4105",
  favorites: "http://favorites-service:4104",
  food: "http://food-service:4101",
  menu: "http://menu-service:4103",
  product: "http://product-service:4102",
};

function createTestGateway(fetchImpl: typeof fetch) {
  return createGatewayApp({
    allowedOrigins: ["http://localhost:3000"],
    fetchImpl,
    serviceUrls,
    storageDriver: "dynamodb",
  });
}

describe("LabelLens gateway", () => {
  it("routes food API requests to food-service", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      return Response.json({ upstreamUrl: String(url) }, { status: 200 });
    });

    const app = createTestGateway(fetchImpl as unknown as typeof fetch);

    const response = await app.request("/api/v1/foods/search?q=oats", {
      headers: { "x-correlation-id": "test-correlation" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBe("test-correlation");
    expect(await response.json()).toEqual({ upstreamUrl: "http://food-service:4101/api/v1/foods/search?q=oats" });
  });

  it("routes product API requests to product-service", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      return Response.json({ upstreamUrl: String(url) }, { status: 200 });
    });

    const app = createTestGateway(fetchImpl as unknown as typeof fetch);
    const response = await app.request("/api/v1/products/barcode/3017624010701");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      upstreamUrl: "http://product-service:4102/api/v1/products/barcode/3017624010701",
    });
  });

  it("routes menu API requests to menu-service", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      return Response.json({ upstreamUrl: String(url) }, { status: 200 });
    });

    const app = createTestGateway(fetchImpl as unknown as typeof fetch);
    const response = await app.request("/api/v1/menus");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ upstreamUrl: "http://menu-service:4103/api/v1/menus" });
  });

  it("routes favorites API requests to favorites-service", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      return Response.json({ upstreamUrl: String(url) }, { status: 200 });
    });

    const app = createTestGateway(fetchImpl as unknown as typeof fetch);
    const response = await app.request("/api/v1/favorites");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ upstreamUrl: "http://favorites-service:4104/api/v1/favorites" });
  });

  it("routes auth API requests to auth-service", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      return Response.json({ upstreamUrl: String(url) }, { status: 200 });
    });

    const app = createTestGateway(fetchImpl as unknown as typeof fetch);
    const response = await app.request("/api/v1/auth/me");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ upstreamUrl: "http://auth-service:4105/api/v1/auth/me" });
  });

  it("returns a gateway health endpoint without calling services", async () => {
    const fetchImpl = vi.fn();
    const app = createTestGateway(fetchImpl as unknown as typeof fetch);

    const response = await app.request("/gateway/health");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "ok", service: "gateway" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns API health at the gateway boundary", async () => {
    const fetchImpl = vi.fn();
    const app = createTestGateway(fetchImpl as unknown as typeof fetch);

    const response = await app.request("/api/v1/health");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "ok", service: "gateway", storageDriver: "dynamodb" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns problem details when the selected service is unavailable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("connection refused");
    });

    const app = createTestGateway(fetchImpl as unknown as typeof fetch);

    const response = await app.request("/api/v1/foods/search?q=oats");
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: 503,
      code: "gateway.upstream_unavailable",
    });
  });
});
