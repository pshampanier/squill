import { CollectionItem } from "@/resources/collection-item";
import { test, expect } from "vitest";

test("find", () => {
  const collections: CollectionItem<"folder" | "workspace">[] = [
    new CollectionItem("workspace 1", { type: "workspace", id: "1" }),
    new CollectionItem("folder 2", {
      type: "folder",
      id: "2",
      children: [
        new CollectionItem("workspace 4", { type: "workspace", id: "4" }),
        new CollectionItem("folder 5", {
          type: "folder",
          id: "5",
          children: [
            new CollectionItem("workspace 6", { type: "workspace", id: "6" }),
            new CollectionItem("folder 7", { type: "folder", id: "7" }),
          ],
        }),
      ],
    }),
    new CollectionItem("workspace 3", { type: "workspace", id: "3" }),
  ];

  const w6 = CollectionItem.find(collections, "6");
  expect(w6?.path).toEqual(["folder 2", "folder 5"]);
  expect(w6?.item.id).toBe("6");

  const w1 = CollectionItem.find(collections, "1");
  expect(w1?.path).toEqual([]);
  expect(w1?.item.id).toBe("1");

  const w5 = CollectionItem.find(collections, "5");
  expect(w5?.path).toEqual(["folder 2"]);
  expect(w5?.item.id).toBe("5");

  const w42 = CollectionItem.find(collections, "42");
  expect(w42).toBeNull();
});
