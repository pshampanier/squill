export class UserError extends Error {
  status: number;
  code: string;
  requestId?: string;

  constructor(obj: Partial<UserError>) {
    super(obj.message);
    Object.assign(this, obj);
    this.name = "UserError";
  }
}
