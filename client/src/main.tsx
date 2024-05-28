import ReactDOM from "react-dom/client";
import { App } from "@/components/App";
import { registerCommand, registerAction } from "@/utils/commands";
import { env } from "@/utils/env";
import { invoke } from "@tauri-apps/api/tauri";
import { QueryClient, QueryClientProvider } from "react-query";

import "@/utils/monaco-workers";
import "@/assets/styles/main.less";

console.log(`Squill ${env.applicationType} (${env.buildType})`);
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

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
    invoke("toggle_devtools");
  });
}
