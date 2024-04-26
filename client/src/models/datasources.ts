import { serializable } from "@/utils/serializable";
import { immerable } from "immer";

export class Datasource {
  [immerable] = true;
  @serializable("string", { required: true })
  name!: string;

  @serializable("string", { format: "identifier" })
  alias!: string;
}
