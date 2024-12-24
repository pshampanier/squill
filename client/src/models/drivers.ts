/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 ********************************************************************/
import { formatRegExp, serializable } from "@/utils/serializable";

export const DRIVER_CONNECTION_MODE = "CONNECTION_MODE";
export const DRIVER_CONNECTION_STRING = "CONNECTION_STRING";
export const DRIVER_URI = "URI";
export const DRIVER_PORT = "PORT";
export const DRIVER_USER = "USER";
export const DRIVER_HOST = "HOST";
export const DRIVER_SOCKET = "SOCKET";
export const DRIVER_PASSWORD = "PASSWORD";

/**
  * Check if the driver has the given capability.
  */
export function hasCapability(driver: Driver, capability: DriverCapabilities): boolean {
  return driver?.capabilities.includes(capability);
}


/**
 * The description of the capabilities of a driver.
 */
export const DRIVER_CAPABILITIES_VALUES = ["sql", "auth_user_password", "auth_password", "connect_string", "connect_host", "connect_socket", "connect_file", "connect_uri", "read_only", "connect_ssl", "single_datasource"] as const;
export type DriverCapabilities = (typeof DRIVER_CAPABILITIES_VALUES)[number];

/**
 * A driver that can be used to connect to a datasource.
 **/
export class Driver {
  
  /**
   * The capabilities of the driver.
   **/
  @serializable("array", { required: true, items: { type: "string", options: { format: formatRegExp(DRIVER_CAPABILITIES_VALUES) } } })
  capabilities!: DriverCapabilities[];
  
  /**
   * The default connection settings of the driver.
   **/
  @serializable("record", { required: true, items: { type: "string" } })
  defaults!: Record<string, string>;
  
  /**
   * The description of the driver.
   **/
  @serializable("string", { required: true })
  description!: string;
  
  /**
   * The icon of the driver (should be a filename, e.g. "postgresql.svg").
   **/
  @serializable("string", { required: true })
  icon!: string;
  
  /**
   * The label of the driver (should be human-readable, e.g. "PostgreSQL").
   **/
  @serializable("string", { required: true })
  label!: string;
  
  /**
   * The name of the driver (should be an identifier, e.g. "postgresql").
   **/
  @serializable("string", { required: true })
  name!: string;
  
  constructor(object?: Partial<Driver>) {
    Object.assign(this, object);
    this.capabilities = Array.from(object?.capabilities || []);
  }
}