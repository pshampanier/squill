import ReactDOM from "react-dom/client";
import { App } from "@/components/App";
import { registerCommand, registerAction } from "@/utils/commands";
import { env } from "@/utils/env";
import { invoke } from "@tauri-apps/api/tauri";

import "@/utils/monaco-workers";
import "@/assets/styles/main.less";

console.log(`One SQL ${env.applicationType} (${env.buildType})`);

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

/**
 * Initialize the desktop app
 */
if (env.applicationType === "desktop") {
  //
  // Show/Hide Developer Tools
  //
  registerCommand({
    name: "devtools:toggle",
    description: "Show Developer Tools",
    shortcut: "F12",
  });
  registerAction("devtools:toggle", () => {
    invoke("toogle_devtools");
  });
}
