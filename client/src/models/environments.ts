import { immerable } from "immer";
import { serializable } from "@/utils/serializable";
import { Variable } from "@/models/variables";
import { Connection } from "@/models/connections";

export class Environment {
  [immerable] = true;

  @serializable("string", { required: true, format: "uuid" })
  id!: string;

  @serializable("string", { required: true, format: "identifier" })
  name!: string;

  @serializable("string")
  description?: string;

  @serializable("string")
  ref?: string;

  @serializable("object", { factory: Connection })
  connections?: Connection[];

  @serializable("object", { factory: Variable })
  variables?: Variable[];

  constructor(object?: Partial<Environment>) {
    Object.assign(this, object);
    this.connections = object?.connections?.map((c) => new Connection(c));
    this.variables = object?.variables?.map((v) => new Variable(v));
  }
}
