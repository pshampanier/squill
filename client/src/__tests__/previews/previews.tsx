import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PreviewsApp } from "./PreviewsApp";
import "@/assets/styles/main.less";
import "@/utils/monaco-workers";

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <PreviewsApp />
  </StrictMode>
);
