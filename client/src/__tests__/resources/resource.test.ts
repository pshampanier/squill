import { Resource } from "@/resources/resource";
import { test, expect, describe } from "vitest";
import { serializable } from "@/utils/serializable";
import { ResourceRef } from "@/resources/resource-ref";

// A class that does not have at least one @serializable property cannot be deserialized
class NonSerializableClass {
  val?: number;
}

describe("as", () => {
  class Test {
    @serializable("integer")
    val?: number;
  }

  test("valid", () => {
    expect(new Resource<Test>("application/json", JSON.stringify({ val: 42 })).as(Test).val).toBe(42);
    expect(new Resource<Test>("application/json", JSON.stringify({})).as(Test).val).toBeUndefined();
  });

  test("invalid", () => {
    expect(() => new Resource<Test>("application/json", "{").as(Test).val).toThrowError();
    expect(() => new Resource<Test>("text/plain", "").as(Test).val).toThrowError(/No data available/);
    expect(() => new Resource<Test>("text/plain", "{}").as(Test).val).toThrowError(
      /Expecting 'content-type: application\/json'/
    );
  });

  test("non serializable object", () => {
    expect(
      () =>
        new Resource<NonSerializableClass>("application/json", JSON.stringify({ val: 42 })).as(NonSerializableClass).val
    ).toThrowError(/Unexpected property 'val'/);
  });
});

describe("asArray", () => {
  class Test {
    @serializable("array", { items: { type: "integer" } })
    values?: number[];
  }

  test("valid", () => {
    expect(new Resource<Test>("application/json", JSON.stringify({ values: [42, 43] })).asArray(Test).values).toEqual([
      42, 43,
    ]);
    expect(new Resource<Test>("application/json", JSON.stringify({ values: [] })).asArray(Test).values).toEqual([]);
  });
});

describe("asText", () => {
  test("valid", () => {
    expect(new Resource("text/plain", "Hello").asText()).toBe("Hello");
  });

  test("invalid", () => {
    expect(() => new Resource("application/json", "{}").asText()).toThrowError(/Expecting 'content-type: text\//);
    expect(() => new Resource("text/plain", "").asText()).toThrowError(/No data available/);
  });
});

describe("ref", () => {
  test("set", () => {
    const resource = new Resource("text/plain", "Hello");
    resource.ref = new ResourceRef("id");
    expect(resource.ref).toEqual({ _id: "id" });
  });

  test("get", () => {
    const resource = new Resource("text/plain", "Hello");
    expect(() => resource.ref).toThrowError(/No ref available/);
  });
});
