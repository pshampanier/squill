/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 ******************************************************/
import { serializable } from "@/utils/serializable";


/**
 * The storage usage of a connection.
 **/
export class ConnectionStorage {
  
  /**
   * The unique identifier of the connection.
   **/
  @serializable("string", { format: "uuid", required: true, snakeCase: "property" })
  connectionId!: string;
  
  /**
   * The name of the connection.
   **/
  @serializable("string", { required: true })
  name!: string;
  
  /**
   * The used storage in bytes.
   **/
  @serializable("integer", { required: true, min: 0, snakeCase: "property" })
  usedBytes!: number;
  
  constructor(object?: Partial<ConnectionStorage>) {
    Object.assign(this, object);
  }
}

/**
 * The storage usage of a user.
 **/
export class UserStorage {
  
  /**
   * The storage usage of the connections owned by the user.
   **/
  @serializable("array", { required: true, items: { type: "object", options: { factory: ConnectionStorage } } })
  connections!: ConnectionStorage[];
  
  /**
   * The unique identifier of the user.
   **/
  @serializable("string", { format: "uuid", required: true, snakeCase: "property" })
  userId!: string;
  
  /**
   * The username of the user.
   **/
  @serializable("string", { required: true })
  username!: string;
  
  constructor(object?: Partial<UserStorage>) {
    Object.assign(this, object);
    this.connections = (object?.connections || []).map((item) => new ConnectionStorage(item));
  }
}