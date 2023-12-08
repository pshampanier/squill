import { Workspace } from "@/resources/workspace/workspace";
import { deserialize } from "@/utils/serializable";
import { describe, test } from "vitest";

describe("valid workspace", () => {
  test("valid workspace", () => {
    const w = deserialize<Workspace>(
      {
        name: "my workspace",
        activeEnvironment: "Production",
        globals: [
          {
            name: "USERNAME",
            type: "text",
            value: "marty",
          },
        ],
        environments: [
          {
            id: "6d13fd0e-b9a0-4cfe-aaf0-58a021831d6d",
            name: "Production",
            connections: [
              {
                id: "29ec7658-d2cd-4358-8a2d-d1960f6f42f2",
                name: "default",
                system: "postgresql",
              },
            ],
            variables: [
              {
                name: "DEFAULT_COUNTRY",
                type: "text",
                value: "USA",
              },
            ],
          },
        ],
        collections: [
          { id: "a85b8e8d-eeb5-46bd-97ec-b33e47d23015", name: "My Collection", type: "folder" },
          { id: "671706e1-2794-473f-bcf6-359b5f6a92af", name: "My dashboard", type: "dashboard" },
        ],
      },
      Workspace
    );
    return w;
  });
});
