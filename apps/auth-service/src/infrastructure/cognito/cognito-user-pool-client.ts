import { createHash } from "node:crypto";

export type CognitoSignUpOptions = {
  region: string;
  clientId: string;
  email: string;
  password: string;
  displayName?: string;
};

export type CognitoSignUpResult = {
  userConfirmed: boolean;
  codeDeliveryDestination?: string;
  codeDeliveryMedium?: string;
};

export type CognitoConfirmSignUpOptions = {
  region: string;
  clientId: string;
  email: string;
  confirmationCode: string;
};

export type CognitoInitiateAuthOptions = {
  region: string;
  clientId: string;
  email: string;
  password: string;
};

export type CognitoForgotPasswordOptions = {
  region: string;
  clientId: string;
  email: string;
};

export type CognitoForgotPasswordResult = {
  codeDeliveryDestination?: string;
  codeDeliveryMedium?: string;
};

export type CognitoConfirmForgotPasswordOptions = {
  region: string;
  clientId: string;
  email: string;
  confirmationCode: string;
  password: string;
};

export type CognitoAuthResult = {
  accessToken: string;
  tokenType: string;
  refreshToken?: string;
  idToken?: string;
};

type CognitoApiError = Error & { code?: string };

type CognitoResponse<T> = {
  data?: T;
  error?: CognitoApiError;
};

const SERVICE_TARGET_PREFIX = "AWSCognitoIdentityProviderService";

export function getCognitoUsernameForEmail(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const emailHash = createHash("sha256").update(normalizedEmail).digest("hex").slice(0, 40);
  return `labellens-${emailHash}`;
}

export async function signUpUser(options: CognitoSignUpOptions): Promise<CognitoSignUpResult> {
  const email = options.email.trim().toLowerCase();
  const displayName = options.displayName?.trim();

  const response = await callCognitoApi<{
    UserConfirmed?: boolean;
    CodeDeliveryDetails?: { Destination?: string; DeliveryMedium?: string };
  }>(options.region, `${SERVICE_TARGET_PREFIX}.SignUp`, {
    ClientId: options.clientId,
    Username: getCognitoUsernameForEmail(email),
    Password: options.password,
    UserAttributes: [
      { Name: "email", Value: email },
      ...(displayName ? [{ Name: "name", Value: displayName }] : []),
    ],
  });

  if (response.error) {
    throw response.error;
  }

  const result: CognitoSignUpResult = {
    userConfirmed: response.data?.UserConfirmed === true,
  };

  const codeDeliveryDestination = response.data?.CodeDeliveryDetails?.Destination;
  const codeDeliveryMedium = response.data?.CodeDeliveryDetails?.DeliveryMedium;

  if (codeDeliveryDestination) {
    result.codeDeliveryDestination = codeDeliveryDestination;
  }

  if (codeDeliveryMedium) {
    result.codeDeliveryMedium = codeDeliveryMedium;
  }

  return result;
}

export async function confirmUserSignUp(options: CognitoConfirmSignUpOptions): Promise<void> {
  const email = options.email.trim().toLowerCase();

  const response = await callCognitoApi(options.region, `${SERVICE_TARGET_PREFIX}.ConfirmSignUp`, {
    ClientId: options.clientId,
    Username: getCognitoUsernameForEmail(email),
    ConfirmationCode: options.confirmationCode,
  });

  if (response.error) {
    throw response.error;
  }
}

export async function initiateUserPasswordAuth(options: CognitoInitiateAuthOptions): Promise<CognitoAuthResult> {
  const email = options.email.trim().toLowerCase();
  let response = await initiateUserPasswordAuthWithUsername(options, email);

  if (response.error?.code === "UserNotFoundException") {
    response = await initiateUserPasswordAuthWithUsername(options, getCognitoUsernameForEmail(email));
  }

  if (response.error) {
    throw response.error;
  }

  const authenticationResult = response.data?.AuthenticationResult;
  const accessToken = authenticationResult?.AccessToken;
  const tokenType = authenticationResult?.TokenType;

  if (!accessToken || !tokenType) {
    const error = new Error("Cognito did not return an access token.") as CognitoApiError;
    error.code = "CognitoInvalidAuthenticationResult";
    throw error;
  }

  return {
    accessToken,
    tokenType,
    ...(authenticationResult?.RefreshToken ? { refreshToken: authenticationResult.RefreshToken } : {}),
    ...(authenticationResult?.IdToken ? { idToken: authenticationResult.IdToken } : {}),
  };
}

export async function forgotUserPassword(options: CognitoForgotPasswordOptions): Promise<CognitoForgotPasswordResult> {
  const email = options.email.trim().toLowerCase();
  let response = await forgotUserPasswordWithUsername(options, email);

  if (response.error?.code === "UserNotFoundException") {
    response = await forgotUserPasswordWithUsername(options, getCognitoUsernameForEmail(email));
  }

  if (response.error) {
    throw response.error;
  }

  return {
    ...(response.data?.CodeDeliveryDetails?.Destination ? { codeDeliveryDestination: response.data.CodeDeliveryDetails.Destination } : {}),
    ...(response.data?.CodeDeliveryDetails?.DeliveryMedium ? { codeDeliveryMedium: response.data.CodeDeliveryDetails.DeliveryMedium } : {}),
  };
}

export async function confirmForgotUserPassword(options: CognitoConfirmForgotPasswordOptions): Promise<void> {
  const email = options.email.trim().toLowerCase();
  let response = await confirmForgotUserPasswordWithUsername(options, email);

  if (response.error?.code === "UserNotFoundException") {
    response = await confirmForgotUserPasswordWithUsername(options, getCognitoUsernameForEmail(email));
  }

  if (response.error) {
    throw response.error;
  }
}

export function decodeJwtClaims(token: string): Record<string, unknown> {
  const segments = token.split(".");
  if (segments.length < 2) {
    return {};
  }

  try {
    const payload = segments[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(segments[1].length / 4) * 4, "=");
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function initiateUserPasswordAuthWithUsername(
  options: CognitoInitiateAuthOptions,
  username: string,
): Promise<
  CognitoResponse<{
    AuthenticationResult?: {
      AccessToken?: string;
      TokenType?: string;
      RefreshToken?: string;
      IdToken?: string;
    };
  }>
> {
  return callCognitoApi(options.region, `${SERVICE_TARGET_PREFIX}.InitiateAuth`, {
    ClientId: options.clientId,
    AuthFlow: "USER_PASSWORD_AUTH",
    AuthParameters: {
      USERNAME: username,
      PASSWORD: options.password,
    },
  });
}

async function forgotUserPasswordWithUsername(
  options: CognitoForgotPasswordOptions,
  username: string,
): Promise<CognitoResponse<{ CodeDeliveryDetails?: { Destination?: string; DeliveryMedium?: string } }>> {
  return callCognitoApi(options.region, `${SERVICE_TARGET_PREFIX}.ForgotPassword`, {
    ClientId: options.clientId,
    Username: username,
  });
}

async function confirmForgotUserPasswordWithUsername(
  options: CognitoConfirmForgotPasswordOptions,
  username: string,
): Promise<CognitoResponse<Record<string, unknown>>> {
  return callCognitoApi(options.region, `${SERVICE_TARGET_PREFIX}.ConfirmForgotPassword`, {
    ClientId: options.clientId,
    Username: username,
    ConfirmationCode: options.confirmationCode,
    Password: options.password,
  });
}

async function callCognitoApi<T = Record<string, unknown>>(
  region: string,
  target: string,
  payload: Record<string, unknown>,
): Promise<CognitoResponse<T>> {
  const response = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": target,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });

  const text = await response.text();
  const body = text ? safeJsonParse(text) : undefined;

  if (!response.ok) {
    const error = new Error(normalizeCognitoErrorMessage(body, response.status)) as CognitoApiError;
    const errorCode = normalizeCognitoErrorCode(body);
    if (errorCode) {
      error.code = errorCode;
    }
    return { error };
  }

  return { data: (body ?? {}) as T };
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function normalizeCognitoErrorCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const code = (body as Record<string, unknown>)["__type"] ?? (body as Record<string, unknown>)["code"];
  if (typeof code !== "string") {
    return undefined;
  }

  const parts = code.split("#");
  return parts[parts.length - 1] || undefined;
}

function normalizeCognitoErrorMessage(body: unknown, status: number): string {
  if (!body || typeof body !== "object") {
    return `Cognito request failed with status ${status}.`;
  }

  const code = normalizeCognitoErrorCode(body);
  const message = (body as Record<string, unknown>)["message"];
  const detail = typeof message === "string" && message.trim().length > 0 ? message.trim() : undefined;

  switch (code) {
    case "UsernameExistsException":
    case "AliasExistsException":
      return "An account with that email already exists.";
    case "InvalidPasswordException":
      return "Password must be at least 8 characters and include a symbol such as !, @, #, $, %, &, *, _, -, +, =, . or ?. Example: Abc123123_";
    case "InvalidParameterException":
      return detail ?? "The account request was invalid.";
    case "CodeMismatchException":
      return "The confirmation code is invalid.";
    case "ExpiredCodeException":
      return "The confirmation code expired. Request a new code and try again.";
    case "UserNotConfirmedException":
      return "Your account is not confirmed yet. Use the confirmation code from your email.";
    case "NotAuthorizedException":
      return "Email or password is incorrect.";
    case "UserNotFoundException":
      return "No account exists for that email.";
    case "LimitExceededException":
      return "Too many attempts. Wait a few minutes and try again.";
    default:
      return detail ?? `Cognito request failed with status ${status}.`;
  }
}
