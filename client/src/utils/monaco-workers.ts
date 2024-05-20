import * as monaco from "monaco-editor";
import { editor } from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import { getSyntaxHighlightingTheme } from "@/utils/colors";
import { EditorSettings } from "@/models/users";

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

monaco.editor.defineTheme("app-light-theme", getMonacoTheme("light"));
monaco.editor.defineTheme("app-dark-theme", getMonacoTheme("dark"));

function getMonacoTheme(colorScheme: "light" | "dark"): editor.IStandaloneThemeData {
  const syntaxHighlightingTheme = getSyntaxHighlightingTheme(colorScheme);
  return {
    base: colorScheme === "light" ? "vs" : "vs-dark",
    inherit: true,
    rules: Object.entries(syntaxHighlightingTheme.tokenColors).map((token) => ({
      token: token[0],
      foreground: token[1],
    })),
    colors: {
      "editor.background": syntaxHighlightingTheme.background,
      "editor.foreground": syntaxHighlightingTheme.foreground,
    },
  };
}

export function getMonacoOptions(settings: EditorSettings) {
  return {
    minimap: {
      enabled: settings.minimap === "show" || settings.minimap === "auto",
    },
    renderWhitespace: settings.renderWhitespace,
  };
}
