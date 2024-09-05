import { formatRegExp, serializable } from "@/utils/serializable";
import { immerable } from "immer";

const QUERY_EXECUTION_STATUS_VALUES = ["pending", "running", "competed", "failed", "cancelled"] as const;
export type QueryExecutionStatus = (typeof QUERY_EXECUTION_STATUS_VALUES)[number];

export class QueryExecutionError {
  @serializable("string")
  message!: string;

  @serializable("integer")
  line?: number;

  @serializable("integer")
  column?: number;
}

export class QueryExecution {
  [immerable] = true;

  /**
   * The ID of the query execution.
   * This ID can be used to fetch the query results from the server.
   */
  @serializable("string", { required: true, format: "uuid" })
  id!: string;

  /**
   * The ID of the connection that was used to execute the query.
   */
  @serializable("string", { format: "uuid", snakeCase: "property", required: true })
  connectionId!: string;

  /**
   * The ID of the batch that this query execution belongs to.
   *
   * If the query was not part of a batch, this value is `undefined`.
   */
  @serializable("string", { format: "uuid", snakeCase: "property" })
  batchId!: string;

  @serializable("string", { format: "uuid", snakeCase: "property", required: true })
  userId!: string;

  @serializable("string", { required: true })
  query!: string;

  @serializable("datetime", { snakeCase: "property" })
  executedAt?: Date;

  @serializable("datetime", { snakeCase: "property" })
  createdAt?: Date;

  /**
   * The execution time in microseconds (µs).
   *
   * This is the time it took to execute the query if the query was successful, otherwise this value is `undefined`.
   */
  @serializable("integer", { snakeCase: "property" })
  executionTime?: number;

  @serializable("integer", { snakeCase: "property" })
  affectedRows?: number;

  @serializable("string", { snakeCase: "property", format: formatRegExp(QUERY_EXECUTION_STATUS_VALUES) })
  status: QueryExecutionStatus;

  @serializable("object", { factory: QueryExecutionError })
  error?: QueryExecutionError;

  constructor(object?: Partial<QueryExecution>) {
    Object.assign(this, object);
  }
}
