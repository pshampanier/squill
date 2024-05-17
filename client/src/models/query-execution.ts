import { serializable } from "@/utils/serializable";
import { immerable } from "immer";

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
  duration?: number;

  @serializable("integer")
  affectedRows?: number;

  constructor(object?: Partial<QueryExecution>) {
    Object.assign(this, object);
  }
}
