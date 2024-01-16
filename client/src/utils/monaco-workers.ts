import * as monaco from "monaco-editor";
import { PRIMARY_COLORS, rgbColor } from "./colors";

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";

self.MonacoEnvironment = {
  getWorker: function (_, label) {
    switch (label) {
      case "html":
      case "markdown":
        return new htmlWorker();
      default:
        return new editorWorker();
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
