/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 ********************************************************************/
import { formatRegExp, serializable } from "@/utils/serializable";


/**
 * The status of a query execution.
 */
export const QUERY_EXECUTION_STATUS_VALUES = ["pending", "running", "completed", "failed", "cancelled"] as const;
export type QueryExecutionStatus = (typeof QUERY_EXECUTION_STATUS_VALUES)[number];


/**
 * An error message from a query execution.
 **/
export class QueryExecutionError {
  
  @serializable("integer", { min: 0 })
  column?: number;
  
  @serializable("integer", { min: 0 })
  line?: number;
  
  @serializable("string")
  message?: string;
  
  constructor(object?: Partial<QueryExecutionError>) {
    Object.assign(this, object);
  }
}


/**
 * The execution of a query.
 **/
export class QueryExecution {
  
  /**
   * The number of rows affected by the query.
   **/
  @serializable("integer", { required: true, min: 0, snakeCase: "property" })
  affectedRows!: number;
  
  /**
   * The unique identifier of the connection used to execute the query.
   **/
  @serializable("string", { format: "uuid", required: true, snakeCase: "property" })
  connectionId!: string;
  
  /**
   * The date and time when the query execution was created.
   * 
   * This is the time when the query was submitted to the agent.
   * 
   **/
  @serializable("datetime", { required: true, snakeCase: "property" })
  createdAt!: Date;
  
  /**
   * The error message if the query execution failed.
   **/
  @serializable("object", { factory: QueryExecutionError })
  error?: QueryExecutionError;
  
  /**
   * The date and time when the query was executed.
   * 
   * This is the time the query was submitted to the agent but the time when the query was submitted to the
   * driver
   * 
   **/
  @serializable("datetime", { snakeCase: "property" })
  executedAt?: Date;
  
  /**
   * The time it took to execute the query in seconds.
   * 
   * The time is captured in nanoseconds and converted to seconds using a 64-bit floating-point allowing for
   * high precision on fast queries without loosing the ability to represent long running queries in seconds.
   * This decision was made to keep that field usable in Javascript where the number type is a 64-bit 
   * floating-point but can only represent integers up to 2^53 - 1 which would be only 2.5 hours in nanoseconds 
   * before starting to loose precision. In addition seconds are more user friendly than nanoseconds.
   * 
   **/
  @serializable("float", { required: true, min: 0, snakeCase: "property" })
  executionTime!: number;
  
  /**
   * The unique identifier of the query execution.
   **/
  @serializable("string", { format: "uuid", required: true })
  id!: string;
  
  /**
   * A collection of key-value pairs that provide additional information about the query execution.
   * 
   * - `schema`:
   *   The schema of the result set for queries with `with_result_set` set to `true`.
   *   The schema is a JSON representation of an Arrow schema using 
   *   [Apache Arrow JSON test data format](https://github.com/apache/arrow/blob/master/docs/source/format/Integration.rst#json-test-data-format)
   *   Having `with_result_set` set to `true` set to true doesn't guarantee that the schema will be present, the 
   *   schema is only present if the query execution was successful.
   * 
   **/
  @serializable("record", { items: { type: "string" } })
  metadata?: Record<string, string>;
  
  /**
   * The origin of the query execution.
   * 
   * The query can be originated from different origins like a terminal or a worksheet. In order to track the
   * history of each of origin independently, the origin is stored in the query execution.
   * 
   * Examples of origins are: `terminal`, `worksheet`, `e7ee76db-8758-4da4-bbce-242c8d1f3d63`, etc.
   * 
   **/
  @serializable("string", { required: true })
  origin!: string;
  
  /**
   * The query that was executed.
   **/
  @serializable("string", { required: true })
  query!: string;
  
  /**
   * The revision number of the query execution.
   * 
   * The revision number is used to track the changes to the query execution. It is incremented each time the
   * query execution is updated. Because the client receive updates of the query execution via different channels
   * (HTTP and WebSocket) there is no guarantee that the last update received is the most recent. By using the
   * revision number the client can avoid overwriting a more recent update with an older one.
   * At creation the revision number is 0.
   * 
   **/
  @serializable("integer", { required: true, min: 0 })
  revision!: number;
  
  /**
   * The status of the query execution.
   **/
  @serializable("string", { format: formatRegExp(QUERY_EXECUTION_STATUS_VALUES), required: true })
  status!: QueryExecutionStatus;
  
  /**
   * The size of the result set on disk in bytes.
   **/
  @serializable("integer", { required: true, min: 0, snakeCase: "property" })
  storageBytes!: number;
  
  /**
   * The unique identifier of the user that executed the query.
   **/
  @serializable("string", { format: "uuid", required: true, snakeCase: "property" })
  userId!: string;
  
  /**
   * A flag indicating if the query is a result set returning query.
   * 
   * This flag is used to determine if the query execution may return the result set or not.
   * 
   * Examples of result set returning queries are:
   * - `SELECT``: The primary statement that retrieves rows from one or more tables.
   * - `SHOW``: A statement that shows information about databases, tables, or other objects.
   * - `INSERT ... RETURNING`: In some databases (like PostgreSQL), `INSERT``, `UPDATE``, and `DELETE`` can 
   *    return rows when combined with the `RETURNING` clause.
   * 
   **/
  @serializable("boolean", { required: true, snakeCase: "property" })
  withResultSet!: boolean;
  
  constructor(object?: Partial<QueryExecution>) {
    Object.assign(this, object);
    this.error = object?.error && new QueryExecutionError(object.error);
  }
}


/**
 * The response of the GET /connections/{id}/history/list endpoint.
 **/
export class QueryHistoryPage {
  
  /**
   * The pagination information for the next page.
   **/
  @serializable("string", { snakeCase: "property" })
  nextPage?: string;
  
  /**
   * The list of queries in the history.
   **/
  @serializable("array", { required: true, items: { type: "object", options: { factory: QueryExecution } } })
  queries!: QueryExecution[];
  
  constructor(object?: Partial<QueryHistoryPage>) {
    Object.assign(this, object);
    this.queries = (object?.queries || []).map((item) => new QueryExecution(item));
  }
}