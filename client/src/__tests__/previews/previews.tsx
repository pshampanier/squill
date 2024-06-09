import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PreviewsApp } from "./PreviewsApp";
import "@/assets/styles/main.less";
import "@/utils/monaco-workers";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <PreviewsApp />
    </QueryClientProvider>
  </StrictMode>,
);
