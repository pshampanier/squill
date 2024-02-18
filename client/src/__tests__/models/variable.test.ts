import { Variable } from "@/models/variables";
import { describe, test, expect } from "vitest";
import { deserialize } from "@/utils/serializable";

describe("Variables", () => {
  test("constructors", () => {
    // No parameters (used for deserialization)
    expect(new Variable()).toMatchObject({});

    // Initialization
    expect(
      new Variable({
        name: "test",
        value: { text: "hello world" },
      })
    ).toMatchObject({
      name: "test",
      value: { text: "hello world" },
    });
  });

  test("set value text", () => {
    const a = new Variable({ name: "a" });
    a.value = { text: "hello world" };
    expect(a.value.text).toBe("hello world");
  });

  test("set value secret", () => {
    const a = new Variable({ name: "a" });
    a.value = { secret: "******" };
    expect(a.value.secret).toBe("******");
  });

  test("set value integer", () => {
    const a = new Variable({ name: "a" });
    a.value = { integer: 42 };
    expect(a.value.integer).toBe(42);
  });

  test("Variable deserialization", () => {
    // string
    expect(
      deserialize<Variable>(
        {
          name: "file",
          value: { text: "test.txt" },
        },
        Variable
      )
    ).toMatchObject({
      name: "file",
      _value: { text: "test.txt" },
    });

    // secret
    expect(
      deserialize<Variable>(
        {
          name: "password",
          value: { secret: "***********" },
        },
        Variable
      )
    ).toMatchObject({
      name: "password",
      _value: { secret: "***********" },
    });

    // integer
    expect(
      deserialize<Variable>(
        {
          name: "max",
          value: { integer: 42 },
        },
        Variable
      )
    ).toMatchObject({
      name: "max",
      _value: { integer: 42 },
    });

    // no value
    expect(
      deserialize<Variable>(
        {
          name: "max",
        },
        Variable
      )
    ).toMatchObject({
      name: "max",
    });
  });

  test("Variable deserialization (missing required property)", () => {
    expect(() => {
      deserialize<Variable>(
        {
          value: { integer: 42 },
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
          name: "file",
          value: { text: 42 },
        },
        Variable
      );
    }).toThrowError(/'42' is not valid at 'value.text'/);

    expect(() => {
      deserialize<Variable>(
        {
          name: "file",
          xvalue: { text: "test" },
        },
        Variable
      );
    }).toThrowError(/Unexpected property 'xvalue'/);
  });
});
