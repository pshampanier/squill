import { expect, test } from "vitest";

test("todo", () => {
  expect(true);
});
/**
 * TODO: MUST BE REWRITTEN
 *
 * 
import { useUserStore } from "@/stores/UserStore";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { Users } from "@/resources/users";
import { Connection } from "@/models/connections";

beforeEach(() => {
  useUserStore.getState().reset();
});

afterEach(() => {
  vi.fn().mockRestore();
});

test("createCatalogEntry", async () => {
  const createCatalogEntry = useUserStore.getState().createCatalogEntry;

  // We are mocking the readCatalog method that will be called the first time we interact with the catalog
  // using createCatalogEntry.
  vi.spyOn(Users, "readCatalog").mockResolvedValue([
    new CollectionItem<"connection">("Conn 1", {
      id: "1",
      type: "connection",
    }),
    new CollectionItem<"folder">("Folder 1", {
      id: "1000",
      type: "folder",
    }),
    new CollectionItem<"connection">("Conn 2", {
      id: "2",
      type: "connection",
    }),
  ]);

  vi.spyOn(Users, "createCatalogEntry")
    .mockResolvedValueOnce(
      new CollectionItem<"connection">("Conn 2", {
        id: "2",
        type: "connection",
      })
    )
    .mockResolvedValueOnce(
      new CollectionItem<"connection">("Conn 3", {
        id: "3",
        type: "connection",
      })
    )
    .mockResolvedValueOnce(
      new CollectionItem<"connection">("Conn 4", {
        id: "4",
        type: "connection",
      })
    )
    .mockResolvedValueOnce(
      new CollectionItem<"connection">("Conn 5", {
        id: "5",
        type: "connection",
      })
    );

  // The catalog is empty at the beginning, so the store will attempt to load the catalog when creating a new entry.
  await createCatalogEntry(
    "connections",
    undefined,
    new Connection({
      id: "2",
      name: "Conn 2",
    })
  );
  let connections = useUserStore.getState().connections;
  let catalog = useUserStore.getState().catalog;
  expect(connections.length).toBe(3);
  expect(catalog.size).toBe(3);

  // When creating a new entry, the store will add that entry to the catalog instead of loading the catalog as in the
  // first call.
  await createCatalogEntry(
    "connections",
    undefined,
    new Connection({
      id: "3",
      name: "Conn 3",
    })
  );
  connections = useUserStore.getState().connections;
  catalog = useUserStore.getState().catalog;
  expect(connections.length).toBe(4);
  expect(catalog.size).toBe(4);

  // Now creating a new entry under the path "connections/Folder 1".
  await createCatalogEntry(
    "connections/Folder 1",
    "1000",
    new Connection({
      id: "4",
      name: "Conn 4",
    })
  );
  connections = useUserStore.getState().connections;
  catalog = useUserStore.getState().catalog;
  expect(connections.length).toBe(4);
  expect(catalog.size).toBe(5);
  expect(catalog.get("1000")?.children.length).toBe(1);
  expect(catalog.get("1000")?.children[0].id).toBe("4");

  // Adding one more entry to the the folder to make sure the children are being added correctly.
  await createCatalogEntry(
    "connections/Folder 1",
    "1000",
    new Connection({
      id: "5",
      name: "Conn 5",
    })
  );
  connections = useUserStore.getState().connections;
  catalog = useUserStore.getState().catalog;
  expect(connections.length).toBe(4);
  expect(catalog.size).toBe(6);
  expect(catalog.get("1000")?.children.length).toBe(2);
  expect(catalog.get("1000")?.children[0].id).toBe("4");
  expect(catalog.get("1000")?.children[1].id).toBe("5");
});

test("renameCatalogItem", async () => {
  const loadCatalogChildren = useUserStore.getState().loadCatalogChildren;
  const renameCatalogItem = useUserStore.getState().renameCatalogItem;

  vi.spyOn(Users, "readCatalog").mockResolvedValue([
    new CollectionItem<"connection">("Conn 1", {
      id: "1",
      type: "connection",
      children: [],
    }),
  ]);
  vi.spyOn(Users, "renameCatalogItem").mockResolvedValue(undefined);

  // First load the catalog with a single item, then rename it.
  await loadCatalogChildren("connections");
  await renameCatalogItem("1", "connections/Conn 1", "My connection");

  const conn = useUserStore.getState().catalog.get("1");
  expect(conn?.name).toBe("My connection");
});

test("loadCatalogChildren", async () => {
  // Adding 2 items to the catalog under the path "connections".
  const spy = vi.spyOn(Users, "readCatalog").mockResolvedValue([
    new CollectionItem<"connection">("Folder", {
      id: "1",
      type: "folder",
      children: [],
    }),
    new CollectionItem<"connection">("Conn 2", {
      id: "2",
      type: "connection",
      children: [],
    }),
  ]);
  const loadCatalogChildren = useUserStore.getState().loadCatalogChildren;
  await loadCatalogChildren("connections", undefined);
  let connections = useUserStore.getState().connections;
  let catalog = useUserStore.getState().catalog;

  // We are expecting to have 2 items in the connections array and 2 items in the catalog such as:
  //
  //  connections = ["1", "2"]
  //  catalog = {
  //    "1": { "id": "1", "name": "Folder", "type": "folder", "children": [] }
  //    "2": { "id": "2", "name": "Conn 2", "type": "connection" }
  //  }
  expect(connections.length).toBe(2);
  expect(catalog.size).toBe(2);
  expect(catalog.get("1")?.name).toBe("Folder");
  expect(catalog.get("1")?.children).toMatchObject([]);
  expect(catalog.get("2")?.name).toBe("Conn 2");
  expect(catalog.get("2")?.children).toBeUndefined();
  expect(catalog.get("3")).toBeUndefined();

  // Adding 1 item to the catalog under the path "connections/Conn 1".
  spy.mockResolvedValueOnce([
    new CollectionItem<"connection">("Conn 3", {
      id: "3",
      type: "connection",
      children: [],
    }),
  ]);
  await loadCatalogChildren("connections/Conn 1", "1");
  connections = useUserStore.getState().connections;
  catalog = useUserStore.getState().catalog;

  // We are expecting to have 2 items in the connections array and 3 items in the catalog such as:
  //
  //  connections = ["1", "2"]
  //  catalog = {
  //    "1": { "id": "1", "name": "Folder", "type": "folder",
  //           "children": [{ "id": "3", "name": "Conn 3", "type": "connection" }]
  //         },
  //    "2": { "id": "2", "name": "Conn 2", "type": "connection" }
  //  }
  expect(connections.length).toBe(2);
  expect(catalog.size).toBe(3);
  expect(catalog.get("1")?.name).toBe("Folder");
  expect(catalog.get("1")?.children.length).toBe(1);
  expect(catalog.get("1")?.children[0].id).toBe("3");
  expect(catalog.get("2")?.name).toBe("Conn 2");
  expect(catalog.get("2")?.children).toBeUndefined();
  expect(catalog.get("3")?.name).toBe("Conn 3");
  expect(catalog.get("3")?.children).toBeUndefined();
});
*/
