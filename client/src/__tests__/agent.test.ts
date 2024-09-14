import { SecurityToken } from "@/models/auth";
import { Agent } from "@/resources/agent";
import { serialize } from "@/utils/serializable";
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

  const agent = await Agent.connect("http://localhost", "x-test-api-key");

  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    headers: {
      get: () => {
        return "application/json";
      },
    },
    text: () => {
      return Promise.resolve(
        JSON.stringify(
          serialize(
            new SecurityToken({
              expiresIn: 10,
              refreshToken: "x-test-refresh-token",
              token: "x-test-token",
              tokenType: "bearer",
              userId: "68F3669F-57E2-4983-A648-D1CACB11F0DC",
              clientId: "3F95E87E-DAA2-40AA-8CE3-C4D245AD6EAC",
              sessionId: "6B69D188-EA12-4877-AB16-567CE8E35A1E",
            }),
          ),
        ),
      );
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
