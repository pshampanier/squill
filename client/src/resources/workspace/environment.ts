import { serializable } from "@/utils/serializable";
import { Connection } from "@/resources/workspace/connection";
import { Variable } from "@/resources/workspace/variable";
import { WorkspaceNode } from "@/resources/workspace/node";

type EnvironmentProps = {
  connections?: Connection[];
  variables?: Variable[];
  id?: string;
};

export class Environment extends WorkspaceNode {
  @serializable("array", { items: { type: "object", options: { factory: Connection } } })
  connections!: Connection[];

  @serializable("array", { items: { type: "object", options: { factory: Variable } } })
  variables!: Variable[];

  constructor();
  constructor(name: string, props?: EnvironmentProps);
  constructor(...args: unknown[]) {
    if (args.length > 0) {
      const [name, props] = args as [string, EnvironmentProps];
      super(name, props?.id);
      this.connections = props?.connections ?? new Array<Connection>();
      this.variables = props?.variables ?? new Array<Variable>();
    } else {
      super();
    }
  }

  clone(): Readonly<Environment> {
    return Object.freeze(
      new Environment(this.name, {
        connections: this.connections.map((c) => c.clone()),
        variables: this.variables.map((v) => v.clone()),
        id: this.id,
      })
    );
  }
}
