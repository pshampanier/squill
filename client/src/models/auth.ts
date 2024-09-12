/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 ********************************************************************/
import { formatRegExp, serializable } from "@/utils/serializable";

export const TOKEN_TYPE_VALUES = ["bearer"] as const;
export type TokenType = (typeof TOKEN_TYPE_VALUES)[number];

export const AUTHENTICATION_METHOD_VALUES = ["user_password"] as const;
export type AuthenticationMethod = (typeof AUTHENTICATION_METHOD_VALUES)[number];



/// A username
type Username = string;



/**
 * A security token used for authentication.
 **/
export class SecurityToken {
  
  /**
   * The number of seconds after which the token will expire.
   **/
  @serializable("integer", { required: true, min: 0, snakeCase: "property" })
  expiresIn!: number;
  
  /**
   * The refresh token is used to generate a new security token.
   **/
  @serializable("string", { required: true, snakeCase: "property" })
  refreshToken!: string;
  
  /**
   * The security token is a 256-bit random number encoded in hexadecimal.
   **/
  @serializable("string", { required: true })
  token!: string;
  
  /**
   * The type of the token (always "Bearer" for now)
   **/
  @serializable("string", { format: formatRegExp(TOKEN_TYPE_VALUES), required: true, snakeCase: "property" })
  tokenType!: TokenType;
  
  /**
   * The unique identifier of the user that the token belongs to.
   **/
  @serializable("string", { format: "uuid", required: true, snakeCase: "property" })
  userId!: string;
  
  constructor(object?: Partial<SecurityToken>) {
    Object.assign(this, object);
  }
}


/**
 * The credentials used to authenticate a user.
 **/
export class Credentials {
  
  @serializable("string")
  password?: string;
  
  @serializable("string", { required: true })
  username!: Username;
  
  constructor(object?: Partial<Credentials>) {
    Object.assign(this, object);
  }
}


export class Authentication {
  
  @serializable("object", { factory: Credentials, required: true })
  credentials!: Credentials;
  
  @serializable("string", { format: formatRegExp(AUTHENTICATION_METHOD_VALUES), required: true })
  method!: AuthenticationMethod;
  
  constructor(object?: Partial<Authentication>) {
    Object.assign(this, object);
    this.credentials = new Credentials(object?.credentials);
  }
}


/**
 * The request body of the POST /auth/refresh-token endpoint.
 **/
export class RefreshToken {
  
  @serializable("string", { required: true, snakeCase: "property" })
  refreshToken!: string;
  
  constructor(object?: Partial<RefreshToken>) {
    Object.assign(this, object);
  }
}