import { formatRegExp, serializable } from "@/utils/serializable";
import { immerable } from "immer";

const QUERY_EXECUTION_STATUS_VALUES = ["pending", "running", "success", "error", "cancelled"] as const;
export type QueryExecutionStatus = (typeof QUERY_EXECUTION_STATUS_VALUES)[number];

export class QueryExecution {
  [immerable] = true;

  @serializable("string", { required: true, format: "uuid" })
  id!: string;

  @serializable("string", { required: true })
  query!: string;

  @serializable("string")
  description?: string;

  @serializable("datetime")
  executedAt?: Date;

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
