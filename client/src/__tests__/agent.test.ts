import { Agent } from "@/resources/agent";
import { describe, test, expect, vi } from "vitest";

describe("logon", () => {
  test.skip("valid login", async () => {
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
    await Agent.connect("http://localhost/" /* trailling '/' */).then((agent: Agent) => {
      agent.logon();
    });
    expect(fetch).toHaveBeenCalledWith("http://localhost/api/v1/logon/default", {
      method: "GET",
    });

    await Agent.connect("http://localhost" /* no trailling '/' */).then((agent: Agent) => {
      agent.logon();
    });
    expect(fetch).toHaveBeenCalledWith("http://localhost/api/v1/logon/default", {
      method: "GET",
    });
  });
});
