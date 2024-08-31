import { formatRegExp, serializable } from "@/utils/serializable";
import { immerable } from "immer";

const QUERY_EXECUTION_STATUS_VALUES = ["pending", "running", "success", "error", "cancelled"] as const;
export type QueryExecutionStatus = (typeof QUERY_EXECUTION_STATUS_VALUES)[number];

export class QueryExecution {
  [immerable] = true;

  /**
   * The ID of the query execution.
   *
   * This ID can be used to fetch the query results from the server.
   */
  @serializable("string", { required: true, format: "uuid" })
  id!: string;

  /**
   * The ID of the batch that this query execution belongs to.
   *
   * If the query was not part of a batch, this value is `undefined`.
   */
  @serializable("string", { format: "uuid" })
  batchId!: string;

  /**
   * The query statement.
   */
  @serializable("string", { required: true })
  query!: string;

  @serializable("string")
  description?: string;

  @serializable("datetime")
  executedAt?: Date;

  /**
   * The execution time in microseconds (µs).
   *
   * This is the time it took to execute the query if the query was successful, otherwise this value is `undefined`.
   */
  @serializable("integer")
  executionTime?: number;

  @serializable("integer")
  affectedRows?: number;

  @serializable("string")
  errorMessage?: string;

  @serializable("integer")
  errorLine?: number;

  @serializable("integer")
  errorColumn?: number;

  @serializable("string", { snakeCase: "property", format: formatRegExp(QUERY_EXECUTION_STATUS_VALUES) })
  status: QueryExecutionStatus;

  constructor(object?: Partial<QueryExecution>) {
    Object.assign(this, object);
  }
}
