import type { AuthSessionVerifier } from "@labellens/application";
import { readDevAuthUser } from "../../auth/dev-auth.js";

export class DevAuthSessionVerifier implements AuthSessionVerifier {
  async verify(authorizationHeader: string | undefined | null) {
    return readDevAuthUser(authorizationHeader);
  }
}