import { formatRegExp, serializable } from "@/utils/serializable";
import { immerable } from "immer";
import { Datasource as Datasources } from "@/models/datasources";

const CONNECTION_MODE = ["host", "socket", "connection_string", "file"] as const;
export type ConnectionMode = (typeof CONNECTION_MODE)[number];

export class Connection {
  [immerable] = true;

  @serializable("string", { required: true, format: "uuid" })
  id!: string;

  @serializable("string", { format: "identifier" })
  driver!: string;

  @serializable("string", { required: true })
  name!: string;

  @serializable("string", { required: true, format: "identifier" })
  alias!: string;

  @serializable("string")
  description?: string;

  @serializable("string", { snakeCase: "property", format: formatRegExp(CONNECTION_MODE) })
  mode!: ConnectionMode;

  @serializable("string")
  host?: string;

  @serializable("integer")
  port?: number;

  @serializable("string")
  socket?: string;

  @serializable("string")
  file?: string;

  @serializable("string", { snakeCase: "property" })
  connectionString?: string;

  @serializable("string")
  username?: string;

  @serializable("string")
  password?: string;

  @serializable("boolean", { snakeCase: "property" })
  savePassword?: boolean;

  @serializable("array", { items: { type: "object", options: { factory: Datasources } } })
  datasources?: Datasources[];

  @serializable("object")
  options?: Record<string, string>;

  constructor(object: Partial<Connection>) {
    Object.assign(this, object);
  }
}
