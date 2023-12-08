export function isMacOS() {
  // @ts-expect-error navigator is not defined in node
  if (navigator.userAgentData) {
    // @ts-expect-error platform is not defined in node
    return navigator.userAgentData.platform === "macOS";
  } else if (navigator.platform) {
    return ["Macintosh", "MacIntel", "MacPPC", "Mac68K"].includes(navigator.platform);
  } else {
    throw new Error("Cannot detect platform");
  }
}
