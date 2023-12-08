import { test, expect, describe } from "vitest";
import { deserialize, serializable, serialize } from "@/utils/serializable";

describe("deserialization", () => {
  test("string", () => {
    class User {
      @serializable("string", { required: true })
      username!: string;
    }
    expect(
      deserialize<User>(
        {
          username: "marty",
        },
        User
      )
    ).toEqual({
      username: "marty",
    });
  });

  test("integer", () => {
    class Point {
      @serializable("integer")
      x?: number;
    }
    expect(
      deserialize<Point>(
        {
          x: 10,
        },
        Point
      )
    ).toEqual({
      x: 10,
    });
  });

  test("inheritance", () => {
    class User {
      @serializable("string", { required: true })
      username!: string;
    }

    class SuperUser extends User {
      @serializable("string")
      password!: number;
    }

    expect(
      deserialize<SuperUser>(
        {
          username: "marty",
          password: ";?DeLorean42",
        },
        SuperUser
      )
    ).toEqual({
      username: "marty",
      password: ";?DeLorean42",
    });
  });

  test("object using a constructor factory", () => {
    class ObjectA {
      @serializable("string")
      property!: string;
    }

    class ObjectB {
      @serializable("object", { factory: ObjectA })
      property!: ObjectA;
    }

    const object_b = deserialize<ObjectB>(
      {
        property: {
          property: "hello world",
        },
      },
      ObjectB
    );

    expect(object_b).toEqual({
      property: {
        property: "hello world",
      },
    });
    expect(object_b).toBeInstanceOf(ObjectB);
    expect(object_b.property).toBeInstanceOf(ObjectA);
  });

  test("object using a function factory", () => {
    class ObjectA {
      @serializable("string")
      property!: string;
    }

    class ObjectB {
      @serializable("object", {
        factory: () => {
          return new ObjectA();
        },
      })
      property!: ObjectA;
    }

    const object_b = deserialize<ObjectB>(
      {
        property: {
          property: "hello world",
        },
      },
      ObjectB
    );

    expect(object_b).toEqual({
      property: {
        property: "hello world",
      },
    });
    expect(object_b).toBeInstanceOf(ObjectB);
    expect(object_b.property).toBeInstanceOf(ObjectA);
  });

  test("custom deserialiser", () => {
    function customDeserializer(value: unknown, key: string | number): [string | number, unknown] {
      switch (key) {
        case "x":
          return [key, parseInt(value as string) * 7];
        default:
          return [key, null];
      }
    }

    class ObjectC {
      @serializable("integer", { deserializer: customDeserializer })
      x!: number;
    }

    expect(deserialize<ObjectC>({ x: 6 }, ObjectC)).toEqual({ x: 42 });
  });

  test("dependencies", () => {
    function customDeserializer(this: ObjectD, value: unknown, key: string | number): [string | number, unknown] {
      switch (key) {
        case "b":
          return [key, (value as number) + this.c + this.d];
        case "c":
          return [key, (value as number) + this.d];
        case "e":
          return [key, (value as number) + this.c];
        default:
          return [key, null];
      }
    }

    class ObjectD {
      @serializable("integer")
      a!: number;

      @serializable("integer", { dependencies: ["c", "d"], deserializer: customDeserializer })
      b!: number;

      @serializable("integer", { dependencies: "d", deserializer: customDeserializer })
      c!: number;

      @serializable("integer")
      d!: number;

      @serializable("integer", { dependencies: "c", deserializer: customDeserializer })
      e!: number;
    }

    expect(
      deserialize<ObjectD>(
        {
          a: 1,
          b: 2,
          c: 3,
          d: 5,
          e: 7,
        },
        ObjectD
      )
    ).toEqual({
      a: 1,
      b: 15,
      c: 8,
      d: 5,
      e: 15,
    });

    return;
  });

  test("array property", () => {
    class ObjectE {
      @serializable("string")
      value!: string;
    }

    class ObjectF {
      @serializable("array", { items: { type: "string" } })
      strings!: string[];

      @serializable("array", { items: { type: "integer" } })
      integers!: number[];

      @serializable("array", { items: { type: "any" } })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      anys!: any[];

      @serializable("array", { items: { type: "object", options: { factory: ObjectE } } })
      objects!: ObjectE[];
    }

    expect(
      deserialize(
        {
          strings: ["a", "b", "c"],
          integers: [1, 2, 3],
          anys: [1, "hello"],
          objects: [
            {
              value: "hello",
            },
            {
              value: "world",
            },
          ],
        },
        ObjectF
      )
    ).toEqual({
      strings: ["a", "b", "c"],
      integers: [1, 2, 3],
      anys: [1, "hello"],
      objects: [
        {
          value: "hello",
        },
        {
          value: "world",
        },
      ],
    });
  });

  test("array", () => {
    class User {
      @serializable("string")
      username?: string;

      constructor(username?: string) {
        this.username = username;
      }
    }

    const users = deserialize<User>([{ username: "marty" }, { username: "doc" }], User);
    expect(users).toBeInstanceOf(Array);
    expect(users).toEqual([new User("marty"), new User("doc")]);
    expect((users as Array<User>)[0]).toBeInstanceOf(User);
    expect((users as Array<User>)[1]).toBeInstanceOf(User);
  });

  test("unknown property", () => {
    class User {
      @serializable("string")
      username?: string;
    }

    expect(() => deserialize<User>({ username: "marty", login: "hello" }, User)).toThrow(/Unexpected property 'login'/);
  });
});

describe("serialization", () => {
  test("primitives types", () => {
    class User {
      @serializable("string")
      username?: string;

      @serializable("integer")
      age?: number;

      @serializable("boolean")
      timeTraveller?: boolean;
    }
    expect(serialize<User>(Object.assign(new User(), { username: "marty", age: 17, timeTraveller: true }))).toEqual({
      username: "marty",
      age: 17,
      timeTraveller: true,
    });
  });

  test("object", () => {
    class User {
      @serializable("string")
      username?: string;

      @serializable("object", { factory: User })
      friend?: User;

      constructor(username?: string, friend?: User) {
        this.username = username;
        this.friend = friend;
      }
    }

    const marty = new User("marty", new User("doc"));
    expect(serialize<User>(marty)).toEqual({
      username: "marty",
      friend: {
        username: "doc",
      },
    });
  });

  test("array property", () => {
    class ObjectA {
      @serializable("array", { items: { type: "string" } })
      values: string[] = ["a", "b"];
    }
    expect(serialize<ObjectA>(new ObjectA())).toEqual({ values: ["a", "b"] });
  });

  test("array", () => {
    class User {
      @serializable("string")
      username?: string;

      constructor(username?: string) {
        this.username = username;
      }
    }

    expect(serialize<User>([new User("marty"), new User("doc")])).toEqual([{ username: "marty" }, { username: "doc" }]);
  });

  test("failure", () => {
    class User {
      @serializable("string", {
        serializer: () => {
          throw new Error("failure");
        },
      })
      username?: string;
    }

    expect(() => serialize<User>(Object.assign(new User(), { username: 42 }))).toThrow(
      /failure for the property 'username'/
    );
  });
});
