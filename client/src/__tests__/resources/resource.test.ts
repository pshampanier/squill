import { SerializedResource } from "@/resources/resources";
import { test, expect, describe } from "vitest";
import { serializable } from "@/utils/serializable";

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
    expect(new SerializedResource<Test>("application/json", JSON.stringify({ val: 42 })).as(Test).val).toBe(42);
    expect(new SerializedResource<Test>("application/json", JSON.stringify({})).as(Test).val).toBeUndefined();
  });

  test("invalid", () => {
    expect(() => new SerializedResource<Test>("application/json", "{").as(Test).val).toThrowError();
    expect(() => new SerializedResource<Test>("text/plain", "").as(Test).val).toThrowError(/No data available/);
    expect(() => new SerializedResource<Test>("text/plain", "{}").as(Test).val).toThrowError(
      /Expecting 'content-type: application\/json'/,
    );
  });

  test("non serializable object", () => {
    expect(
      () =>
        new SerializedResource<NonSerializableClass>("application/json", JSON.stringify({ val: 42 })).as(
          NonSerializableClass,
        ).val,
    ).toThrowError(/Unexpected property 'val'/);
  });
});

describe("asArray", () => {
  class Test {
    @serializable("array", { items: { type: "integer" } })
    values?: number[];
  }

  test("valid", () => {
    expect(
      new SerializedResource<Test>("application/json", JSON.stringify({ values: [42, 43] })).asArray(Test).values,
    ).toEqual([42, 43]);
    expect(
      new SerializedResource<Test>("application/json", JSON.stringify({ values: [] })).asArray(Test).values,
    ).toEqual([]);
  });
});

describe("asText", () => {
  test("valid", () => {
    expect(new SerializedResource("text/plain", "Hello").asText()).toBe("Hello");
  });

  test("invalid", () => {
    expect(() => new SerializedResource("application/json", "{}").asText()).toThrowError(
      /Expecting 'content-type: text\//,
    );
    expect(() => new SerializedResource("text/plain", "").asText()).toThrowError(/No data available/);
  });
});
