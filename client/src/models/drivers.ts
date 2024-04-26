import { serializable } from "@/utils/serializable";

export const DRIVER_PORT = "PORT";
export const DRIVER_USER = "USER";
export const DRIVER_HOST = "HOST";
export const DRIVER_SOCKET = "SOCKET";
export const DRIVER_PASSWORD = "PASSWORD";

export type Capability =
  | "sql"
  | "auth_user_password"
  | "auth_password"
  | "connect_string"
  | "connect_host"
  | "connect_socket"
  | "connect_file"
  | "read_only";

export class Driver {
  @serializable("string", { format: "identifier" })
  readonly name!: string;

  @serializable("string")
  readonly label!: string;

  @serializable("string")
  readonly icon!: string;

  @serializable("string")
  readonly description!: string;

  @serializable("array", { items: { type: "string" } })
  readonly capabilities!: Capability[];

  @serializable("object", { deserializer: defaultsDeserializer })
  readonly defaults: Record<string, string>;
}

function defaultsDeserializer(value: unknown, key: string): [string, unknown] {
  return [key, value];
}
