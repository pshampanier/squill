import { User } from "@/resources/user/user";
import { test, expect } from "vitest";
import { deserialize } from "@/utils/serializable";

test("valid user", () => {
  expect(
    deserialize<User>(
      {
        username: "marty",
      },
      User
    )
  ).toEqual({
    username: "marty",
    settings: {
      editor: {
        minimap: "hide",
        renderWhitespace: "none",
      },
      showFavorites: true,
      showRecentlyOpened: true,
      telemetry: true,
      theme: "light",
    },
    collections: [],
    favorites: [],
  });
});

test("invalid user", () => {
  expect(() =>
    deserialize<User>(
      {
        username: "ma rty",
      },
      User
    )
  ).toThrowError(/'ma rty' is not valid/);
});

test("constructor", () => {
  expect(new User("marty")).toEqual({
    username: "marty",
    settings: {
      editor: {
        minimap: "hide",
        renderWhitespace: "none",
      },
      showFavorites: true,
      showRecentlyOpened: true,
      telemetry: true,
      theme: "light",
    },
    collections: [],
    favorites: [],
  });
});
