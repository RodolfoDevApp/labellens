import type { AuthUser } from "@labellens/application";
import type { AppDependencies } from "../../composition/app-dependencies.js";
import { problemDetails } from "../../shared/problem-details.js";

export async function requireAuthUser(
  dependencies: AppDependencies,
  authorizationHeader: string | undefined,
  correlationId: string,
): Promise<{ ok: true; user: AuthUser } | { ok: false; response: Response }> {
  const user = await dependencies.authSessionVerifier.verify(authorizationHeader);

  if (!user) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify(
          problemDetails({
            title: "Login required",
            status: 401,
            detail: "Saving and reading personal menus requires a signed-in user.",
            code: "auth.required",
            correlationId,
          }),
        ),
        {
          status: 401,
          headers: { "content-type": "application/problem+json" },
        },
      ),
    };
  }

  return { ok: true, user };
}
