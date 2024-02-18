import { serializable } from "@/utils/serializable";
import { immerable } from "immer";
import { Variable } from "@/models/variables";
import { Environment } from "@/models/environments";

export class Workspace {
  [immerable] = true;

  @serializable("string", { required: true, format: "uuid" })
  id!: string;

  @serializable("string", { required: true, format: "identifier" })
  name!: string;

  @serializable("string")
  description?: string;

  @serializable("object", { factory: Environment })
  environment?: Environment[];

  @serializable("object", { factory: Variable })
  variables?: Variable[];

  constructor(object?: Partial<Workspace>) {
    Object.assign(this, object);
    this.variables = object?.variables?.map((v) => new Variable(v));
    this.environment = object?.environment?.map((e) => new Environment(e));
  }
}
