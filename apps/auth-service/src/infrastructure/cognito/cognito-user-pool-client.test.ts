import { afterEach, describe, expect, it, vi } from "vitest";
import {
  confirmForgotUserPassword,
  confirmUserSignUp,
  forgotUserPassword,
  getCognitoUsernameForEmail,
  initiateUserPasswordAuth,
  signUpUser,
} from "./cognito-user-pool-client.js";

describe("Cognito user pool client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("derives a stable non-email Cognito username from the normalized email", () => {
    const username = getCognitoUsernameForEmail(" User@Example.COM ");

    expect(username).toBe(getCognitoUsernameForEmail("user@example.com"));
    expect(username).toMatch(/^labellens-[a-f0-9]{40}$/);
    expect(username).not.toContain("@");
  });

  it("signs up email-alias users with a generated username and email attribute", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        UserConfirmed: false,
        CodeDeliveryDetails: {
          Destination: "u***@example.com",
          DeliveryMedium: "EMAIL",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await signUpUser({
      region: "us-east-1",
      clientId: "client-id",
      email: "user@example.com",
      password: "password-123",
      displayName: "User",
    });

    expect(result).toEqual({
      userConfirmed: false,
      codeDeliveryDestination: "u***@example.com",
      codeDeliveryMedium: "EMAIL",
    });

    const request = getCognitoRequest(fetchMock, 0);
    expect(request.target).toBe("AWSCognitoIdentityProviderService.SignUp");
    expect(request.payload).toMatchObject({
      ClientId: "client-id",
      Username: getCognitoUsernameForEmail("user@example.com"),
      Password: "password-123",
      UserAttributes: [
        { Name: "email", Value: "user@example.com" },
        { Name: "name", Value: "User" },
      ],
    });
  });

  it("confirms email-alias users with the generated username", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);

    await confirmUserSignUp({
      region: "us-east-1",
      clientId: "client-id",
      email: "user@example.com",
      confirmationCode: "123456",
    });

    const request = getCognitoRequest(fetchMock, 0);
    expect(request.target).toBe("AWSCognitoIdentityProviderService.ConfirmSignUp");
    expect(request.payload).toMatchObject({
      ClientId: "client-id",
      Username: getCognitoUsernameForEmail("user@example.com"),
      ConfirmationCode: "123456",
    });
  });


  it("starts password recovery with the email alias and reports delivery details", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        CodeDeliveryDetails: {
          Destination: "u***@example.com",
          DeliveryMedium: "EMAIL",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await forgotUserPassword({
      region: "us-east-1",
      clientId: "client-id",
      email: "User@Example.COM",
    });

    expect(result).toEqual({
      codeDeliveryDestination: "u***@example.com",
      codeDeliveryMedium: "EMAIL",
    });
    expect(getCognitoRequest(fetchMock, 0)).toMatchObject({
      target: "AWSCognitoIdentityProviderService.ForgotPassword",
      payload: {
        ClientId: "client-id",
        Username: "user@example.com",
      },
    });
  });

  it("confirms password recovery with generated username fallback for email-alias pools", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          {
            __type: "UserNotFoundException",
            message: "User does not exist.",
          },
          { status: 400 },
        ),
      )
      .mockResolvedValueOnce(Response.json({}));
    vi.stubGlobal("fetch", fetchMock);

    await confirmForgotUserPassword({
      region: "us-east-1",
      clientId: "client-id",
      email: "user@example.com",
      confirmationCode: "123456",
      password: "Abc123123_",
    });

    expect(getCognitoRequest(fetchMock, 0).payload).toMatchObject({
      Username: "user@example.com",
    });
    expect(getCognitoRequest(fetchMock, 1).payload).toMatchObject({
      Username: getCognitoUsernameForEmail("user@example.com"),
      ConfirmationCode: "123456",
      Password: "Abc123123_",
    });
  });

  it("retries password auth with the generated username when the email alias is not found", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          {
            __type: "UserNotFoundException",
            message: "User does not exist.",
          },
          { status: 400 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({
          AuthenticationResult: {
            AccessToken: "access-token",
            TokenType: "Bearer",
            IdToken: "id-token",
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await initiateUserPasswordAuth({
      region: "us-east-1",
      clientId: "client-id",
      email: "user@example.com",
      password: "password-123",
    });

    expect(result).toEqual({
      accessToken: "access-token",
      tokenType: "Bearer",
      idToken: "id-token",
    });

    expect(getCognitoRequest(fetchMock, 0).payload).toMatchObject({
      AuthParameters: {
        USERNAME: "user@example.com",
        PASSWORD: "password-123",
      },
    });
    expect(getCognitoRequest(fetchMock, 1).payload).toMatchObject({
      AuthParameters: {
        USERNAME: getCognitoUsernameForEmail("user@example.com"),
        PASSWORD: "password-123",
      },
    });
  });
});

function getCognitoRequest(fetchMock: { mock: { calls: unknown[][] } }, callIndex: number) {
  const [, init] = fetchMock.mock.calls[callIndex] as [string, RequestInit];
  const headers = init.headers as Record<string, string>;
  const payload = JSON.parse(String(init.body)) as Record<string, unknown>;

  return {
    target: headers["X-Amz-Target"],
    payload,
  };
}
