export type AuthUser = {
  userId: string;
  displayName: string;
};

export interface AuthSessionVerifier {
  verify(authorizationHeader: string | undefined | null): Promise<AuthUser | null>;
}
