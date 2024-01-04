type Plateform = "windows" | "macos" | "linux" | "unknown";

export class Env {
  readonly plateform: Plateform = this.detectPlateform();
  readonly colorScheme: "light" | "dark" = this.detectColorScheme();

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
