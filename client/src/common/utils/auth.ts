export const AUTHENTICATION_METHODS = ["user_password", "key", "token"] as const;
export type AuthenticationMethods = (typeof AUTHENTICATION_METHODS)[number];

export interface AuthToken {
  token: string;
  expires: number;
}

export interface AuthTokenResponse {
  token: string;
  expires: number;
}

export type AuthUserPassword = {
  username: string;
  password: string;
};

export type AuthKey = string;

export type AuthCredentials = AuthUserPassword | AuthKey;

export type AuthRequest = {
  method: AuthenticationMethods;
  credentials: AuthCredentials;
};
