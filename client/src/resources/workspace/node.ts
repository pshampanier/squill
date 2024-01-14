import { serializable } from "@/utils/serializable";

export abstract class WorkspaceNode {
  @serializable("string", { format: "uuid" })
  readonly id: string = crypto.randomUUID();

  @serializable("string", { required: true, trim: true })
  name!: string;

  /**
   * Constructors
   */
  constructor(name: string, id?: string);
  constructor();
  constructor(...args: unknown[]) {
    if (args.length > 0) {
      const [name, id] = args as [string, string];
      this.name = name;
      this.id = id ? id : this.id;
    }
  }
}
