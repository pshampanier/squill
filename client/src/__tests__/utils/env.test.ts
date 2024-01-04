import { test, expect, vi } from "vitest";
import { Env } from "@/utils/env";

test("plateform", () => {
  // Windows
  vi.stubGlobal("navigator", {
    userAgentData: {
      platform: "Windows",
    },
  });
  expect(new Env().plateform).toBe("windows");
  vi.stubGlobal("navigator", {
    userAgentData: undefined,
    platform: "Win32",
  });
  expect(new Env().plateform).toBe("windows");

  // MacOS
  vi.stubGlobal("navigator", {
    userAgentData: {
      platform: "macOS",
    },
  });
  expect(new Env().plateform).toBe("macos");
  vi.stubGlobal("navigator", {
    userAgentData: undefined,
    platform: "MacIntel",
  });
  expect(new Env().plateform).toBe("macos");

  // Linux
  vi.stubGlobal("navigator", {
    userAgentData: {
      platform: "Linux",
    },
  });
  expect(new Env().plateform).toBe("linux");
  vi.stubGlobal("navigator", {
    userAgentData: undefined,
    platform: "Linux x86_64",
  });
  expect(new Env().plateform).toBe("linux");

  vi.unstubAllGlobals();
});

test("colorScheme", () => {
  // Light
  vi.stubGlobal("window", {
    matchMedia: () => ({
      matches: false,
    }),
  });
  expect(new Env().colorScheme).toBe("light");

  // Dark
  vi.stubGlobal("window", {
    matchMedia: () => ({
      matches: true,
    }),
  });
  expect(new Env().colorScheme).toBe("dark");

  vi.unstubAllGlobals();
});
