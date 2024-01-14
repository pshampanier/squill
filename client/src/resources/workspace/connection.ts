import { serializable } from "@/utils/serializable";
import { WorkspaceNode } from "@/resources/workspace/node";

type ConnectionProps = {
  system: string;
  credentials?: {
    user?: string;
    password?: string;
  };
  id?: string;
};

export class Connection extends WorkspaceNode {
  @serializable("string", { format: "identifier", required: true })
  readonly system!: string;

  credentials?: {
    user?: string;
    password?: string;
  };

  constructor();
  constructor(name: string, props: ConnectionProps);
  constructor(...args: unknown[]) {
    if (args.length == 2) {
      const [name, props] = args as [string, ConnectionProps];
      super(name, props.id);
      this.system = props.system;
      this.credentials = { ...props.credentials };
    } else {
      super();
    }
  }

  clone(): Readonly<Connection> {
    return Object.freeze(
      new Connection(this.name, { system: this.system, credentials: this.credentials, id: this.id })
    );
  }
}
