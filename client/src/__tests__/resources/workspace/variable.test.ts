import { Variable } from "@/resources/workspace/variable";
import { describe, test, expect } from "vitest";
import { deserialize } from "@/utils/serializable";

describe("Variables", () => {
  test("constructors", () => {
    // No parameters (used for deserialization)
    expect(new Variable()).toEqual({});

    // Initialization
    expect(new Variable("test", "text", { value: "hello world" })).toEqual({
      name: "test",
      type: "text",
      _value: "hello world",
    });
  });

  test("set value text", () => {
    const a = new Variable("a", "text");
    a.value = "hello world";
    expect(a.value).toBe("hello world");
  });

  test("set value secret", () => {
    const a = new Variable("a", "secret");
    a.value = "******";
    expect(a.value).toBe("******");
  });

  test("set value integer", () => {
    const a = new Variable("a", "integer");
    a.value = 42;
    expect(a.value).toBe(42);
  });

  test("Variable deserialization", () => {
    // string
    expect(
      deserialize<Variable>(
        {
          name: "file",
          value: "test.txt",
          type: "text",
        },
        Variable
      )
    ).toEqual({
      name: "file",
      _value: "test.txt",
      type: "text",
    });

    // secret
    expect(
      deserialize<Variable>(
        {
          name: "password",
          type: "secret",
          value: "***********",
        },
        Variable
      )
    ).toEqual({
      name: "password",
      type: "secret",
      _value: "***********",
    });

    // integer
    expect(
      deserialize<Variable>(
        {
          name: "max",
          value: "42",
          type: "integer",
        },
        Variable
      )
    ).toEqual({
      name: "max",
      _value: 42,
      type: "integer",
    });

    // no value
    expect(
      deserialize<Variable>(
        {
          name: "max",
          type: "integer",
        },
        Variable
      )
    ).toEqual({
      name: "max",
      type: "integer",
    });
  });

  test("Variable deserialization (missing required property)", () => {
    expect(() => {
      deserialize<Variable>(
        {
          name: "max",
        },
        Variable
      );
    }).toThrowError(/'type' of the required properties missing/);

    expect(() => {
      deserialize<Variable>(
        {
          type: "text",
        },
        Variable
      );
    }).toThrowError(/'name' of the required properties missing/);
  });

  test("Variable deserialization (invalid values)", () => {
    expect(() => {
      deserialize<Variable>(
        {
          name: 42,
        },
        Variable
      );
    }).toThrowError(/'42' is not valid \(expected format: 'identifier'\) for the property 'name'/);

    expect(() => {
      deserialize<Variable>(
        {
          type: "unknown",
        },
        Variable
      );
    }).toThrowError(/'unknown' is not valid for the property 'type'/);

    expect(() => {
      deserialize<Variable>(
        {
          name: "file",
          value: 42,
          type: "text",
        },
        Variable
      );
    }).toThrowError(/'42' is not valid for the property 'value'/);

    expect(() => {
      deserialize<Variable>(
        {
          name: "file",
          xvalue: "test",
          type: "text",
        },
        Variable
      );
    }).toThrowError(/Unexpected property 'xvalue'/);
  });
});
