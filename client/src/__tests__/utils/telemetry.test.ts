import { test, expect } from "vitest";
import { assert } from "@/utils/telemetry";

test("assert", () => {
  expect(() => assert(true)).not.toThrow();
  expect(() => assert(false)).toThrowError(/Invalid application state/);
  expect(() => assert(false, "bad")).toThrowError(/bad/);
});
