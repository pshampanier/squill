import ReactDOM from "react-dom/client";
import { App } from "@/components/App";
import { env } from "@/utils/env";
import { QueryClient, QueryClientProvider } from "react-query";

import "@/utils/monaco-workers";
import "@/assets/styles/main.less";

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
