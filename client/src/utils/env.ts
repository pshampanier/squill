/// <reference types="vite/client" />
import { invoke } from "@tauri-apps/api/tauri";

type Platform = "windows" | "macos" | "linux" | "unknown";
type ApplicationType = "desktop" | "web";
type BuildType = "debug" | "release";

export type AgentConnectionParameters = {
  url: string;
  apiKey: string;
};

export class Env {
  readonly platform: Platform = this.detectPlatform();

  get colorScheme(): "light" | "dark" {
    return this.detectColorScheme();
  }

  get applicationType(): ApplicationType {
    return window.__TAURI__ ? "desktop" : "web";
  }

  get buildType(): BuildType {
    return import.meta.env.DEV ? "debug" : "release";
  }

  // Get the value of a variable from the environment.
  //
  // - When running in a Tauri application, the variable is fetched from the using the command get_variable implemented
  //   in Rust.
  // - When running in a web browser in dev mode, the variable is fetched from the environment using the Vite
  //   environment variables defined in .env files (see https://vitejs.dev/guide/env-and-mode.html).
  async getVariable(name: string): Promise<string | undefined> {
    if (window.__TAURI__) {
      return invoke("get_variable", { name });
    } else if (import.meta.env.DEV) {
      // Because vite only expose variable prefixed with VITE_ we need to prefix the variable name with VITE_.
      return import.meta.env["VITE_" + name];
    }
  }

  async getAgentConnectionParameters(): Promise<AgentConnectionParameters> {
    return {
      url: await this.getVariable("LOCAL_AGENT_URL"),
      apiKey: await this.getVariable("LOCAL_AGENT_API_KEY"),
    };
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
