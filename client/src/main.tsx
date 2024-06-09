import ReactDOM from "react-dom/client";
import { App } from "@/components/App";
import { env } from "@/utils/env";

import "@/utils/monaco-workers";
import "@/assets/styles/main.less";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Initialize the environment (required for the desktop app)
env.init().then(() => {
  console.log(`Squill ${env.applicationType} (${env.buildType})`);
  const queryClient = new QueryClient();
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
});
