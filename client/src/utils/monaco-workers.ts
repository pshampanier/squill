import * as monaco from "monaco-editor";
import { PRIMARY_COLORS, rgbColor } from "./colors";

self.MonacoEnvironment = {
  getWorker: function (_, label) {
    const getWorkerModule = (moduleUrl: string, label: string) => {
      return new Worker(self.MonacoEnvironment.getWorkerUrl(moduleUrl, label), {
        name: label,
        type: "module",
      });
    };

    switch (label) {
      case "json":
        return getWorkerModule("/monaco-editor/esm/vs/language/json/json.worker?worker", label);
      case "html":
      case "markdown":
        return getWorkerModule("/monaco-editor/esm/vs/language/html/html.worker?worker", label);
      case "typescript":
      case "javascript":
        return getWorkerModule("/monaco-editor/esm/vs/language/typescript/ts.worker?worker", label);
      default:
        return getWorkerModule("/monaco-editor/esm/vs/editor/editor.worker?worker", label);
    }
  },
};

monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

/**
 * Define custom themes for Monaco editor that match the primary colors of the application.
 */

monaco.editor.defineTheme("app-light-theme", {
  base: "vs",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": rgbColor(PRIMARY_COLORS, "background", "light"),
  },
});

monaco.editor.defineTheme("app-dark-theme", {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": rgbColor(PRIMARY_COLORS, "background", "dark"),
  },
});
