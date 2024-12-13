import * as monaco from "monaco-editor";
import { editor } from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import { getSyntaxHighlightingTheme } from "@/utils/colors";
import { MonacoEditorSettings } from "@/models/user-settings";

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

/**
 * Convert the user settings into Monaco editor options.
 */
export function intoMonacoOptions(settings: MonacoEditorSettings): monaco.editor.IEditorOptions {
  if (settings) {
    return {
      minimap: {
        enabled: settings.minimap === "show" || settings.minimap === "auto",
        autohide: settings.minimap === "auto",
      },
      matchBrackets: settings.matchBrackets,
      renderWhitespace: settings.whitespace,
      /* @ts-expect-error TS2322 */
      cursorStyle: {
        underline: "underline",
        line: "line",
        block: "block",
        block_outline: "block-outline",
        line_thin: "line-thin",
        underline_thin: "underline-thin",
      }[settings.cursorStyle],
    };
  } else {
    return {};
  }
}
