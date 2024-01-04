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

  // with a trailling '/' at the end of the host
  await Agent.connect("http://localhost/" /* trailling '/' */);
  expect(fetch).toHaveBeenCalledWith("http://localhost/api/v1/agent.json", {
    method: "GET",
  });

  vi.fn().mockClear();

  // without a trailling '/' at the end of the host
  await Agent.connect("http://localhost" /* no trailling '/' */);
  expect(fetch).toHaveBeenCalledWith("http://localhost/api/v1/agent.json", {
    method: "GET",
  });
});

test("logon", async () => {
  const agent = await Agent.connect("http://localhost");

  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    headers: {
      get: () => {
        return "application/json";
      },
    },
    text: () => {
      return Promise.resolve(JSON.stringify({ username: "local" }));
    },
  });

  const user = await agent.logon({ method: "user_password", credentials: { username: "local", password: "" } });
  expect(fetch).toHaveBeenCalledWith("http://localhost/api/v1/users/local/user.json", {
    method: "GET",
  });
  expect(user.username).toBe("local");
});
