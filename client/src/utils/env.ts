/// <reference types="vite/client" />
import { invoke } from "@tauri-apps/api/tauri";

type Plateform = "windows" | "macos" | "linux" | "unknown";
type ApplicationType = "desktop" | "web";
type BuildType = "debug" | "release";

export class Env {
  readonly plateform: Plateform = this.detectPlateform();

  get colorScheme(): "light" | "dark" {
    return this.detectColorScheme();
  }

  get applicationType(): ApplicationType {
    return window.__TAURI__ ? "desktop" : "web";
  }

  get buildType(): BuildType {
    return import.meta.env.DEV ? "debug" : "release";
  }

  async getVariable(name: string): Promise<string | undefined> {
    if (window.__TAURI__) {
      return invoke("get_variable", { name });
    }
  }

  async getLocalAgentUrl(): Promise<string> {
    let url = await this.getVariable("LOCAL_AGENT_URL");
    if (!url) {
      url = window.location.href.split("/").slice(0, -1).join("/");
    }
    return url;
  }

  /**
   * Detect the plateform using the web hints if available, otherwise fallback to the navigator.
   * @returns Detected plateform.
   */
  private detectPlateform(): Plateform {
    // @ts-expect-error Property 'userAgentData' does not exist on type 'Navigator'
    const platform = (navigator.userAgentData?.platform || navigator.platform || "")?.toLowerCase();
    if (platform.startsWith("win")) return "windows";
    if (platform.startsWith("mac")) return "macos";
    if (platform.startsWith("linux")) return "linux";
    return "unknown";
  }

  /**
   * Detect the prefered color scheme from the operating system.
   * @returns Detected color scheme.
   */
  private detectColorScheme(): "light" | "dark" {
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
      return "dark";
    return "light";
  }
}

export const env = new Env();
