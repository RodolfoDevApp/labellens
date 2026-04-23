import type { AuthSessionVerifier } from "@labellens/application";
import { CognitoJwtAuthSessionVerifier } from "./cognito-jwt-auth-session-verifier.js";
import { DevAuthSessionVerifier } from "./dev-auth-session-verifier.js";

export type RuntimeAuthSessionVerifierOptions = {
  cognitoUserPoolId?: string | undefined;
  cognitoUserPoolClientId?: string | undefined;
};

export function createRuntimeAuthSessionVerifier(
  options: RuntimeAuthSessionVerifierOptions,
): AuthSessionVerifier {
  if (options.cognitoUserPoolId && options.cognitoUserPoolClientId) {
    return new CognitoJwtAuthSessionVerifier({
      userPoolId: options.cognitoUserPoolId,
      clientId: options.cognitoUserPoolClientId,
    });
  }

  return new DevAuthSessionVerifier();
}
