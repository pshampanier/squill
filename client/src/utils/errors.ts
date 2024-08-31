export class UserError extends Error {
  status?: number;
  code?: string;
  requestId?: string;

  constructor(message: string);
  constructor(obj: string | Partial<UserError>) {
    super(typeof obj === "string" ? obj : obj.message);
    this.name = "UserError";
    if (obj instanceof Object) {
      Object.assign(this, obj);
    }
  }
}

export class AuthenticationError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class HttpRequestError extends Error {
  status: number;
  body?: string;

  constructor(status: number, message: string, body?: string) {
    super(message);
    this.name = "HttpRequestError";
    this.status = status;
    this.body = body;
  }
}
