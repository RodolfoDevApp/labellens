import type { DemoLoginRequestContract } from "../schemas/demo-login-schema.js";

export type AuthUserContract = {
  userId: string;
  displayName: string;
};

export type DemoLoginApiRequestContract = DemoLoginRequestContract;

export type DemoLoginResponseContract = {
  tokenType: "Bearer";
  accessToken: string;
  user: AuthUserContract;
};

export type CurrentUserResponseContract = {
  user: AuthUserContract;
};
