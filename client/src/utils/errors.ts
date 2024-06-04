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
