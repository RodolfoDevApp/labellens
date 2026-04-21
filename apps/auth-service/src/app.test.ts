import { describe, expect, it } from "vitest";
import { createAuthServiceApp } from "./app.js";

describe("auth-service", () => {
  it("issues a local demo token and reads the current user", async () => {
    const app = createAuthServiceApp();
    const loginResponse = await app.request("/api/v1/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Demo" }),
    });

    expect(loginResponse.status).toBe(200);
    const login = await loginResponse.json();

    const meResponse = await app.request("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${login.accessToken}` },
    });

    expect(meResponse.status).toBe(200);
    expect(await meResponse.json()).toMatchObject({ user: { userId: "demo-user" } });
  });
});
