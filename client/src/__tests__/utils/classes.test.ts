import { test, expect } from "vitest";
import { useClasses } from "@/utils/classes";

test("useClasses", () => {
  expect(useClasses(["foo", "bar"])).toBe("foo bar");
  expect(useClasses(["foo", { light: "bar ok", dark: "baz zag" }])).toBe("foo bar ok dark:baz dark:zag");
  expect(useClasses(["foo", { light: "bar ok", dark: "baz   zag" }])).toBe("foo bar ok dark:baz dark:zag");
  expect(() => useClasses(["foo", { light: "bar ok", dark: "dark:baz zag" }])).toThrow(
    /'dark:' should not be included/
  );
  expect(() => useClasses([{ light: "dark:bar ok", dark: "baz zag" }])).toThrow(
    /Theme is 'light' but some classes contain 'dark:'/
  );
});
