import { describe, expect, it, vi } from "vitest";
import { createGatewayApp } from "./app.js";

describe("LabelLens gateway", () => {
  it("proxies v1 API requests to the internal API service", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      return Response.json({ upstreamUrl: String(url) }, { status: 200 });
    });

    const app = createGatewayApp({
      apiInternalBaseUrl: "http://internal-api:4100",
      allowedOrigins: ["http://localhost:3000"],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await app.request("/api/v1/foods/search?q=oats", {
      headers: { "x-correlation-id": "test-correlation" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBe("test-correlation");
    expect(await response.json()).toEqual({ upstreamUrl: "http://internal-api:4100/api/v1/foods/search?q=oats" });
  });

  it("returns a gateway health endpoint without calling the internal API", async () => {
    const fetchImpl = vi.fn();
    const app = createGatewayApp({
      apiInternalBaseUrl: "http://internal-api:4100",
      allowedOrigins: ["http://localhost:3000"],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await app.request("/gateway/health");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "ok", service: "gateway" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns problem details when the internal API is unavailable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("connection refused");
    });

    const app = createGatewayApp({
      apiInternalBaseUrl: "http://internal-api:4100",
      allowedOrigins: ["http://localhost:3000"],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await app.request("/api/v1/health");
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: 503,
      code: "gateway.upstream_unavailable",
    });
  });
});
