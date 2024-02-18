import { formatRegExp, serializable } from "@/utils/serializable";

const TOKEN_TYPE = ["bearer"] as const;
export type TokenType = (typeof TOKEN_TYPE)[number];

export class SecurityToken {
  /// The security token is a 256-bit random number encoded in hexadecimal.
  @serializable("string")
  token: string;

  /// The type of the token (always "Bearer" for now)
  @serializable("string", { format: formatRegExp(TOKEN_TYPE), trim: true, snakeCase: "property" })
  tokenType: TokenType;

  /// The refresh token is used to generate a new security token.
  @serializable("string", { snakeCase: "property" })
  refreshToken: string;

  /// The number of seconds after which the token will expire.
  @serializable("integer", { snakeCase: "property" })
  expiresIn: number;

  /// The user id associated with the token.
  @serializable("string", { snakeCase: "property" })
  userId: string;

  constructor(object: Partial<SecurityToken>) {
    Object.assign(this, object);
  }
}

export const AUTHENTICATION_METHOD = ["user_password"] as const;
export type AuthenticationMethod = (typeof AUTHENTICATION_METHOD)[number];

/// Body of the POST /auth/logon endpoint.
export class AuthRequest {
  @serializable("string", { format: formatRegExp(AUTHENTICATION_METHOD), trim: true })
  method: AuthenticationMethod;

  @serializable("object")
  credentials: AuthUserPassword;

  constructor(object: Partial<AuthRequest>) {
    Object.assign(this, object);
    this.credentials = new AuthUserPassword(this.credentials);
  }
}

/// Credentials used to authenticate a user.
export class AuthUserPassword {
  @serializable("string", { trim: true })
  username: string;

  @serializable("string", { trim: true })
  password: string;

  constructor(object: Partial<AuthUserPassword>) {
    Object.assign(this, object);
  }
}

/// Body of the POST /auth/refresh-token endpoint.
export class AuthRefresh {
  @serializable("string", { snakeCase: "property" })
  refreshToken: string;

  constructor(object: Partial<AuthRefresh>) {
    Object.assign(this, object);
  }
}
