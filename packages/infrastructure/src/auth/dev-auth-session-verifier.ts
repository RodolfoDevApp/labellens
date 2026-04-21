import type { AuthSessionVerifier } from "@labellens/application";
import { readDevAuthUser } from "./dev-auth-token.js";

export class DevAuthSessionVerifier implements AuthSessionVerifier {
  async verify(authorizationHeader: string | undefined | null) {
    return readDevAuthUser(authorizationHeader);
  }
}
