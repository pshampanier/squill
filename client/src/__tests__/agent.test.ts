import { Agent } from "@/resources/agent";
import { test, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.fn().mockRestore();
});

test("connect", async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    headers: {
      get: () => {
        return "application/json";
      },
    },
    text: () => {
      return Promise.resolve("{}");
    },
  });

  // with a trailing '/' at the end of the host
  await Agent.connect("http://localhost/" /* trailing '/' */, "x-test-api-key");
  expect(fetch).toHaveBeenCalledWith("http://localhost/api/v1/agent", {
    method: "GET",
    headers: {
      "X-Api-Key": "x-test-api-key",
    },
  });

  vi.fn().mockClear();

  // without a trailing '/' at the end of the host
  await Agent.connect("http://localhost" /* no trailing '/' */, "x-test-api-key");
  expect(fetch).toHaveBeenCalledWith("http://localhost/api/v1/agent", {
    method: "GET",
    headers: {
      "X-Api-Key": "x-test-api-key",
    },
  });
});

test("logon", async () => {
  const agent = await Agent.connect("http://localhost", "x-test-api-key");

  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    headers: {
      get: () => {
        return "application/json";
      },
    },
    text: () => {
      return Promise.resolve("{}");
    },
  });

  await agent.logon({ method: "user_password", credentials: { username: "local", password: "" } });
  expect(fetch).toHaveBeenCalledWith("http://localhost/api/v1/auth/logon", {
    method: "POST",
    body: '{"method":"user_password","credentials":{"username":"local","password":""}}',
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": "x-test-api-key",
    },
  });
});
