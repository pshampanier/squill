import { expect, test } from "vitest";
import { ResourceRef } from "@/resources/resource-ref";

test("constructor", () => {
  expect(new ResourceRef(["path 1", "path 2"], "file.txt")).toEqual({ _path: ["path 1", "path 2"], _name: "file.txt" });
  expect(new ResourceRef("id")).toEqual({ _id: "id" });
});

test("id", () => {
  expect(new ResourceRef("id").id).toBe("id");
  expect(() => new ResourceRef(["path"], "file.txt").id).toThrow("DEBUG: ResourceRef is not an ID reference");
});

test("path", () => {
  expect(new ResourceRef(["path"], "file.txt").path).toEqual(["path"]);
  expect(() => new ResourceRef("id").path).toThrow("DEBUG: ResourceRef is not a path/name reference");
});

test("name", () => {
  expect(new ResourceRef(["path"], "file.txt").name).toBe("file.txt");
  expect(() => new ResourceRef("id").name).toThrow("DEBUG: ResourceRef is not a path/name reference");
});

test("getURIEncodedFullPath", () => {
  expect(new ResourceRef(["path 1", "path 2"], "file.txt").getURIEncodedFullPath()).toBe("path%201/path%202/file.txt");
});
