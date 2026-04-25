import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthServiceApp } from "./app.js";
import { getCognitoUsernameForEmail } from "./infrastructure/cognito/cognito-user-pool-client.js";

describe("auth-service", () => {
  beforeEach(() => {
    delete process.env.COGNITO_USER_POOL_ID;
    delete process.env.COGNITO_USER_POOL_CLIENT_ID;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });


  it("uses the Cognito ID token name as the display name instead of the generated username", async () => {
    process.env.COGNITO_USER_POOL_ID = "us-east-1_example";
    process.env.COGNITO_USER_POOL_CLIENT_ID = "client-id";

    const email = "marban@example.com";
    const generatedUsername = getCognitoUsernameForEmail(email);
    const accessToken = createJwt({ sub: "user-id", username: generatedUsername });
    const idToken = createJwt({ sub: "user-id", name: "Marban", email });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ UserConfirmed: true }))
      .mockResolvedValueOnce(
        Response.json({
          AuthenticationResult: {
            AccessToken: accessToken,
            TokenType: "Bearer",
            IdToken: idToken,
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const app = createAuthServiceApp();
    const response = await app.request("/api/v1/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "register", email, password: "Abc123123!", displayName: "Marban" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      user: {
        userId: "user-id",
        displayName: "Marban",
      },
    });

    const [, signUpRequest] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(signUpRequest.body))).toMatchObject({
      Username: generatedUsername,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "name", Value: "Marban" },
      ],
    });
  });

  it("issues a demo session token and reads the current user when Cognito is disabled", async () => {
    const app = createAuthServiceApp();
    const loginResponse = await app.request("/api/v1/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "register", email: "demo@example.com", password: "demo-pass-123", displayName: "Demo" }),
    });

    expect(loginResponse.status).toBe(200);
    const login = await loginResponse.json();

    const meResponse = await app.request("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${login.accessToken}` },
    });

    expect(meResponse.status).toBe(200);
    expect(await meResponse.json()).toMatchObject({ user: { displayName: "Demo" } });
  });
});

function createJwt(payload: Record<string, unknown>): string {
  const encodedHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }), "utf8").toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

  return `${encodedHeader}.${encodedPayload}.signature`;
}
