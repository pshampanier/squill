declare module "*.svg?react" {
  import * as React from "react";
  const ReactComponent: React.FunctionComponent<React.ComponentProps<"svg"> & { title?: string }>;
  export default ReactComponent;
}

declare module "*.worker?worker" {
  const content: new () => Worker;
  export = content;
}
