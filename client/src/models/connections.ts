/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 ********************************************************************/
import { formatRegExp, serializable } from "@/utils/serializable";
import { immerable } from "immer";


/**
 * The mode of a connection.
 */
export const CONNECTION_MODE_VALUES = ["host", "socket", "file", "connection_string", "uri"] as const;
export type ConnectionMode = (typeof CONNECTION_MODE_VALUES)[number];

/**
 * The payload of the POST /connections/{id}/run endpoint.
 **/
export class RunRequest {
  
  /**
   * A text buffer containing 0 or more queries.
   **/
  @serializable("string", { required: true })
  buffer!: string;
  
  /**
   * The name of the datasource to be used within the connection.
   **/
  @serializable("string", { required: true })
  datasource!: string;
  
  /**
   * The origin of the request ('terminal', 'worksheet', etc).
   **/
  @serializable("string", { required: true })
  origin!: string;
  
  constructor(object?: Partial<RunRequest>) {
    Object.assign(this, object);
  }
}

/**
 * The description of a datasource (database for SQL engines).
 **/
export class Datasource {
  
  /**
   * The description of the datasource (e.g. "My database").
   **/
  @serializable("string")
  description?: string;
  
  /**
   * A flag indicating if the datasource is hidden in the user interface.
   **/
  @serializable("boolean")
  hidden?: boolean;
  
  /**
   * The name of the datasource (e.g. "my_database").
   **/
  @serializable("string", { required: true })
  name!: string;
  
  /**
   * The size of the datasource in bytes.
   **/
  @serializable("integer", { snakeCase: "property" })
  sizeInBytes?: number;
  
  constructor(object?: Partial<Datasource>) {
    Object.assign(this, object);
  }
}

/**
 * Description of a connection to a datasource.
 **/
export class ConnectionInfo {
  
  /**
   * The version of the server (e.g. "9.0.1").
   **/
  @serializable("string", { required: true, snakeCase: "property" })
  backendVersion!: string;
  
  /**
   * The name of the current datasource (e.g. "my_database").
   **/
  @serializable("string", { snakeCase: "property" })
  currentDatasource?: string;
  
  /**
   * The description of the connection (e.g. "Server version: 9.0.1 MySQL Community Server - GPL").
   * 
   **/
  @serializable("string", { required: true })
  description!: string;
  
  constructor(object?: Partial<ConnectionInfo>) {
    Object.assign(this, object);
  }
}

/**
 * Definition of a connection to datasources.
 **/
export class Connection {
  [immerable] = true;
  
  /**
   * The alias of the connection.
   **/
  @serializable("string")
  alias?: string;
  
  /**
   * The connection string of the connection.if the connection mode is "connection_string".
   **/
  @serializable("string", { snakeCase: "property" })
  connectionString?: string;
  
  /**
   * The list of datasources available for the connection.
   **/
  @serializable("array", { items: { type: "object", options: { factory: Datasource } } })
  datasources?: Datasource[];
  
  /**
   * The name of the default datasource to use.
   **/
  @serializable("string", { snakeCase: "property" })
  defaultDatasource?: string;
  
  /**
   * The description of the connection.
   **/
  @serializable("string")
  description?: string;
  
  /**
   * The name of the driver used to connect to the datasource.
   **/
  @serializable("string")
  driver?: string;
  
  /**
   * The file of the connection.if the connection mode is "file".
   **/
  @serializable("string")
  file?: string;
  
  /**
   * The host of the connection.if the connection mode is "host".
   **/
  @serializable("string")
  host?: string;
  
  /**
   * The unique identifier of the connection.
   **/
  @serializable("string", { format: "uuid", required: true })
  id!: string;
  
  @serializable("string", { format: formatRegExp(CONNECTION_MODE_VALUES), required: true })
  mode!: ConnectionMode;
  
  /**
   * The name of the connection.
   **/
  @serializable("string", { required: true })
  name!: string;
  
  /**
   * Additional options of the connection.
   **/
  @serializable("record", { items: { type: "string" } })
  options?: Record<string, string>;
  
  /**
   * The unique identifier of the user that owns the connection.
   **/
  @serializable("string", { format: "uuid", required: true, snakeCase: "property" })
  ownerUserId!: string;
  
  /**
   * The unique identifier of the parent resource in the catalog.
   **/
  @serializable("string", { format: "uuid", required: true, snakeCase: "property" })
  parentId!: string;
  
  /**
   * The password for authentication.
   **/
  @serializable("string")
  password?: string;
  
  /**
   * The port of the connection.if the connection mode is "host".
   **/
  @serializable("integer", { min: 0 })
  port?: number;
  
  /**
   * Whether the password should be saved.
   **/
  @serializable("boolean", { required: true, snakeCase: "property" })
  savePassword!: boolean;
  
  /**
   * The socket of the connection.if the connection mode is "socket".
   **/
  @serializable("string")
  socket?: string;
  
  /**
   * The URI of the connection.if the connection mode is "uri".
   **/
  @serializable("string")
  uri?: string;
  
  /**
   * The username for authentication.
   **/
  @serializable("string")
  username?: string;
  
  constructor(object?: Partial<Connection>) {
    Object.assign(this, object);
    this.datasources = (object?.datasources || []).map((item) => new Datasource(item));
  }
}