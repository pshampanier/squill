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

/**
 * Extract the message to display to the user.
 *
 * The can be anything but this function will try to extract a string from it, allowing only to display errors that are
 * user-friendly.
 */
export function sanitizeMessage(message: Error | string | unknown): string | undefined {
  if (message instanceof UserError) {
    return message.message;
  } else if (message instanceof AuthenticationError) {
    return "Authentication failed.";
  } else if (typeof message === "string") {
    return message;
  } else {
    return undefined;
  }
}
