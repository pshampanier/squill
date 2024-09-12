/// <reference types="vite/client" />
import { UserError } from "@/utils/errors";
import { AgentEndpoint } from "@/models/agent";
import { Tauri } from "@/utils/tauri";

type Platform = "windows" | "macos" | "linux" | "unknown";
type ApplicationType = "desktop" | "web";
type BuildType = "debug" | "release";

export class Env {
  readonly platform: Platform = this.detectPlatform();
  agentEndpoint: AgentEndpoint | null = null;

  async init() {
    // When running the desktop app, the RUST code will send the agent connection parameters to the client.
    // every time the agent is started or stopped. When stopped, the payload of the event will be null, otherwise
    // it will contain the agent connection parameters.
    if (this.applicationType === "desktop") {
      this.agentEndpoint = await Tauri.getAgentEndpoint();
      await Tauri.listenAgentEndpoint((agentEndpoint: AgentEndpoint) => {
        console.log("Received the agent connection parameters: ", agentEndpoint);
        this.agentEndpoint = agentEndpoint;
      });
    } else {
      // When running in a web browser, we are using the Vite environment variables to get the agent connection parameters.
      this.agentEndpoint = new AgentEndpoint({
        url: `http://${import.meta.env["VITE_AGENT_ADDRESS"]}:${import.meta.env["VITE_AGENT_PORT"]}`,
        apiKey: import.meta.env["VITE_AGENT_API_KEY"],
      });
    }
  }

  get colorScheme(): "light" | "dark" {
    return this.detectColorScheme();
  }

  get applicationType(): ApplicationType {
    return window.__TAURI__ ? "desktop" : "web";
  }

  get buildType(): BuildType {
    return import.meta.env.DEV ? "debug" : "release";
  }

  /**
   * A unique identifier for the client.
   * This is used for telemetry, allowing to distinguish between different downloads of the client.
   */
  get clientId(): string {
    let uuid = localStorage.getItem("client_id");
    if (!uuid) {
      uuid = crypto.randomUUID();
      localStorage.setItem("client_id", uuid);
    }
    return uuid;
  }

  getAgentEndpoint(): AgentEndpoint {
    if (!this.agentEndpoint) throw new UserError("The agent is not currently running.");
    return this.agentEndpoint;
  }

  /**
   * Detect the platform using the web hints if available, otherwise fallback to the navigator.
   * @returns Detected platform.
   */
  private detectPlatform(): Platform {
    // @ts-expect-error Property 'userAgentData' does not exist on type 'Navigator'
    const platform = (navigator.userAgentData?.platform || navigator.platform || "")?.toLowerCase();
    if (platform.startsWith("win")) return "windows";
    if (platform.startsWith("mac")) return "macos";
    if (platform.startsWith("linux")) return "linux";
    return "unknown";
  }

  /**
   * Detect the preferred color scheme from the operating system.
   * @returns Detected color scheme.
   */
  private detectColorScheme(): "light" | "dark" {
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
      return "dark";
    return "light";
  }
}

export const env = new Env();
