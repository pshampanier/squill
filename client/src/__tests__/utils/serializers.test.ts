import * as s from "@/utils/serializers";
import { describe, test, expect } from "vitest";

describe("deserializeInteger", () => {
  test("valid value", () => {
    expect(s.deserializeInteger("10")).toBe(10);
    expect(s.deserializeInteger("+10")).toBe(10);
    expect(s.deserializeInteger("-10")).toBe(-10);
    expect(s.deserializeInteger(" 10 ")).toBe(10);
    expect(s.deserializeInteger(" +10 ")).toBe(10);
    expect(s.deserializeInteger(" -10 ")).toBe(-10);
    expect(s.deserializeInteger("\t10\t")).toBe(10);
    expect(s.deserializeInteger("10", { min: 9 })).toBe(10);
    expect(s.deserializeInteger("9", { min: 9 })).toBe(9);
    expect(s.deserializeInteger("10", { max: 11 })).toBe(10);
    expect(s.deserializeInteger("11", { max: 11 })).toBe(11);
    expect(s.deserializeInteger(10)).toBe(10);
    expect(s.deserializeInteger("1,042")).toBe(1042);
    expect(s.deserializeInteger("1 042")).toBe(1042);
  });
  test("invalid value", () => {
    expect(() => s.deserializeInteger("hello")).toThrowError(/is not a valid integer/);
    expect(() => s.deserializeInteger("12x3")).toThrowError(/is not a valid integer/);
    expect(() => s.deserializeInteger("1.03")).toThrowError(/is not a valid integer/);
    expect(() => s.deserializeInteger("")).toThrowError(/is not a valid integer/);
    expect(() => s.deserializeInteger(" ")).toThrowError(/is not a valid integer/);
    expect(() => s.deserializeInteger("+")).toThrowError(/is not a valid integer/);
    expect(() => s.deserializeInteger("8", { min: 9 })).toThrowError(/should be at least 9/);
    expect(() => s.deserializeInteger("10", { max: 9 })).toThrowError(/should be at most 9/);
    expect(() => s.deserializeInteger("xxx", { name: "test" })).toThrowError(/for the property 'test'/);
    expect(() => s.deserializeInteger(undefined)).toThrowError(/'' is not a valid integer/);
    expect(() => s.deserializeInteger(new Date())).toThrowError(/is not a valid integer/);
  });
});

describe("deserializeString", () => {
  test("valid value", () => {
    expect(s.deserializeString("hello word")).toBe("hello word");
    expect(s.deserializeString("  hello word  ", { trim: true })).toBe("hello word");
    expect(s.deserializeString("  abbba  ", { format: /^[ab]{5}$/, trim: true })).toBe("abbba");
    expect(s.deserializeString("my_identifier", { format: "identifier" })).toBe("my_identifier");
    expect(s.deserializeString(" my_identifier ", { format: "identifier" })).toBe("my_identifier");
    expect(s.deserializeString("_", { format: "identifier" })).toBe("_");
  });
  test("invalid value", () => {
    expect(() => s.deserializeString(undefined)).toThrowError(/is not valid/);
    expect(() => s.deserializeString(null)).toThrowError(/is not valid/);
    expect(() => s.deserializeString(12)).toThrowError(/is not valid/);
    expect(() => s.deserializeString(new Date())).toThrowError(/is not valid/);
    expect(() => s.deserializeString("  abbba  ", { format: /[ab]{10}/ })).toThrowError(/is not valid/);
    expect(() => s.deserializeString(undefined, { name: "test" })).toThrowError(/is not valid for the property 'test'/);
    expect(() => s.deserializeString(undefined, { format: "identifier" })).toThrowError(/is not valid/);
    expect(() => s.deserializeString(null, { format: "identifier" })).toThrowError(/is not valid/);
    expect(() => s.deserializeString(12, { format: "identifier" })).toThrowError(/is not valid/);
    expect(() => s.deserializeString("12_my_identifier", { format: "identifier" })).toThrowError(/is not valid/);
    expect(() => s.deserializeString(undefined, { name: "test", format: "identifier" })).toThrowError(
      /'' is not valid \(expected format: 'identifier'\) for the property 'test'/
    );
  });
});

describe("deserializeObject", () => {
  test("valid value", () => {
    const expected = {
      firstname: "Marty",
      lastname: "McFly",
      age: 17,
    };
    const obj = {
      firstname: "",
      lastname: "",
      age: 0,
    };
    s.deserializeObject(expected, ([k, v]) => {
      switch (k) {
        case "firstname":
        case "lastname":
          obj[k] = v as string;
          break;
        case "age":
          obj[k] = v as number;
      }
    });
    expect(obj).toEqual(expected);
  });

  test("invalid value", () => {
    expect(() =>
      s.deserializeObject("", ([k, v]) => {
        k && v;
      })
    ).toThrowError(/is not valid/);

    //
    // Name of the object included in the error.
    //
    expect(() =>
      s.deserializeObject(
        "",
        ([k, v]) => {
          k && v;
        },
        { name: "test" }
      )
    ).toThrowError(/is not valid, object expected for the property 'test'/);

    //
    // Name of the invalid property should include the path of parent properties
    //
    expect(() =>
      s.deserializeObject(
        {
          username: "test",
          aliases: [{ alias: "first alias" }, 12],
        },
        ([k, v]) => {
          switch (k) {
            case "aliases": {
              s.deserializeArray(
                v,
                (item) => {
                  s.deserializeObject(item, () => {
                    item;
                  });
                },
                { name: k }
              );
            }
          }
        },
        { name: "user" }
      )
    ).toThrowError(/is not valid, object expected at 'user\.aliases\[1\]'/);

    //
    // The callback throws errors.
    //
    expect(() =>
      s.deserializeObject(
        { user: "marty" },
        () => {
          throw new Error("invalid object");
        },
        { name: "test" }
      )
    ).toThrowError(/invalid object for the property 'test'/);

    expect(() =>
      s.deserializeObject(
        { user: "marty" },
        () => {
          throw "invalid object";
        },
        { name: "test" }
      )
    ).toThrowError(/invalid object for the property 'test'/);

    expect(() =>
      s.deserializeObject(
        { user: "marty" },
        () => {
          throw 42;
        },
        { name: "test" }
      )
    ).toThrowError(/42 for the property 'test'/);

    expect(() =>
      s.deserializeObject(
        { user: "marty" },
        () => {
          throw null;
        },
        { name: "test" }
      )
    ).toThrowError(/for the property 'test'/);
  });

  test("required properties", () => {
    const expected = {
      firstname: "Marty",
      lastname: "McFly",
      age: 17,
    };
    const obj = {
      firstname: "",
      lastname: "",
      age: 0,
    };
    s.deserializeObject(
      expected,
      ([k, v]) => {
        switch (k) {
          case "firstname":
          case "lastname":
            return (obj[k] = v as string);
          case "age":
            return (obj[k] = v as number);
        }
      },
      {
        required: ["firstname", "age"],
      }
    );
    expect(obj).toEqual(expected);

    //
    // Missing one required properties
    //
    expect(() =>
      s.deserializeObject(
        {
          firstname: "Marty",
          lastname: "McFly",
        },
        ([k, v]) => {
          k && v;
        },
        {
          required: ["firstname", "age"],
        }
      )
    ).toThrowError(/'age' of the required properties missing/);

    //
    // Missing more than one required properties (should name all missing props in the exception).
    //
    expect(() =>
      s.deserializeObject(
        {
          lastname: "McFly",
        },
        ([k, v]) => {
          k;
          return v;
        },
        {
          required: ["firstname", "age"],
        }
      )
    ).toThrowError(/'firstname', 'age' of the required properties missing/);

    //
    // Required property is an empty string.
    //
    expect(() =>
      s.deserializeObject(
        {
          firstname: "  ",
          lastname: "McFly",
        },
        ([k, v]) => {
          k;
          return (v as string).trim();
        },
        {
          required: ["firstname"],
        }
      )
    ).toThrowError(/'firstname' of the required properties missing/);

    //
    // Unexpected property
    //
    expect(() =>
      s.deserializeObject(
        {
          firstname: "Marty",
          xlastname: "McFly",
        },
        ([k, v]) => {
          switch (k) {
            case "firstname":
            case "lastname":
              return (v as string).trim();
            default:
              return null;
          }
        }
      )
    ).toThrowError(/Unexpected property 'xlastname'/);
  });

  test("dependencies", () => {
    //
    // A property (b) depends on another one (c), so its expected to be deserialized after its dependancy.
    //
    let obj = {
      a: 0,
      b: 0,
      c: 0,
    };
    s.deserializeObject(
      {
        a: 1,
        b: 2,
        c: 3,
      },
      ([k, v]) => {
        switch (k) {
          case "a":
          case "c":
            return (obj[k] = v as number);
          case "b":
            return (obj[k] = obj.c * (v as number));
        }
      },
      {
        dependencies: {
          b: ["c"],
        },
      }
    );
    expect(obj).toEqual({
      a: 1,
      b: 6,
      c: 3,
    });

    //
    // A property (b) depends on another one (c) but the first (b) not being available, it should works regardless if
    // c is available or not.
    //
    obj = {
      a: 0,
      b: 0,
      c: 0,
    };
    s.deserializeObject(
      {
        a: 1,
      },
      ([k, v]) => {
        switch (k) {
          case "a":
          case "c":
            return (obj[k] = v as number);
          case "b":
            return (obj[k] = obj.c * (v as number));
        }
      },
      {
        dependencies: {
          b: ["c"],
        },
      }
    );
    expect(obj).toEqual({
      a: 1,
      b: 0,
      c: 0,
    });

    //
    // A property (b) depends on another one (c) but the dependency (c) not being available, we should get an error.
    //
    obj = {
      a: 0,
      b: 0,
      c: 0,
    };
    expect(() =>
      s.deserializeObject(
        {
          a: 1,
          b: 2,
        },
        () => {},
        {
          dependencies: {
            b: ["c"],
          },
        }
      )
    ).toThrowError(/The property 'b' depends on 'c' which is not available/);
  });
});

describe("deserializeArray", () => {
  test("valid value", () => {
    let expectedIndex = 0;
    expect(
      s.deserializeArray<number>(["1", "2"], (item, index) => {
        expect(index).toBe(expectedIndex++);
        return parseInt(item as string);
      })
    ).toEqual([1, 2]);
    expect(s.deserializeArray<number>([], (item) => parseInt(item as string), { minSize: 0 })).toEqual([]);

    /*
     * minSize option
     */
    expect(s.deserializeArray<number>(["1", "2"], (item) => parseInt(item as string), { minSize: 0 })).toEqual([1, 2]);
    expect(s.deserializeArray<number>(["1", "2"], (item) => parseInt(item as string), { minSize: 2 })).toEqual([1, 2]);

    /*
     * maxSize option
     */
    expect(s.deserializeArray<number>(["1", "2"], (item) => parseInt(item as string), { maxSize: 2 })).toEqual([1, 2]);
    expect(s.deserializeArray<number>(["1", "2"], (item) => parseInt(item as string), { maxSize: 3 })).toEqual([1, 2]);
  });

  test("invalid value", () => {
    expect(() => s.deserializeArray<number>("", (item) => parseInt(item as string))).toThrowError(/is not an array/);
    expect(() => s.deserializeArray<number>(null, (item) => parseInt(item as string))).toThrowError(/is not an array/);
    expect(() => s.deserializeArray<number>(undefined, (i) => parseInt(i as string))).toThrowError(/is not an array/);

    /*
     * options (min, max, name)
     */
    expect(() =>
      s.deserializeArray<number>(["1", "2"], (item) => parseInt(item as string), { minSize: 3 })
    ).toThrowError(/Expecting at least 3 item\(s\)/);
    expect(() =>
      s.deserializeArray<number>(["1", "2"], (item) => parseInt(item as string), { maxSize: 1 })
    ).toThrowError(/Expecting at most 1 item\(s\)/);
    expect(() => s.deserializeArray<number>(12, (item) => parseInt(item as string), { name: "test" })).toThrowError(
      /'12' is not an array for the property 'test'/
    );
  });
});
