import type { AuthSessionVerifier, AuthUser } from "@labellens/application";
import { problemDetails } from "../problem-details.js";

export type RequireAuthUserResult =
  | { ok: true; user: AuthUser }
  | { ok: false; response: Response };

export async function requireAuthUser(
  authSessionVerifier: AuthSessionVerifier,
  authorizationHeader: string | undefined,
  correlationId: string,
): Promise<RequireAuthUserResult> {
  const user = await authSessionVerifier.verify(authorizationHeader);

  if (!user) {
    return {
      ok: false,
      response: Response.json(
        problemDetails({
          title: "Authentication required",
          status: 401,
          detail: "Sign in before saving or reading personal data.",
          code: "auth.required",
          correlationId,
        }),
        { status: 401 },
      ),
    };
  }

  return { ok: true, user };
}
