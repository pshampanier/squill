import { env } from "@/utils/env";
import { formatRegExp, serializable } from "@/utils/serializable";
import { immerable } from "immer";

const COLOR_SCHEME = ["light", "dark", "auto"] as const;
const MINIMAP = ["show", "hide", "auto"] as const;
const RENDER_WHITESPACE = ["all", "none", "boundary", "selection", "trailing"] as const;

export type RenderWhitespaceValue = (typeof RENDER_WHITESPACE)[number];
export type MinimapValue = (typeof MINIMAP)[number];

export type ColorScheme = (typeof COLOR_SCHEME)[number];

export class EditorSettings {
  @serializable("string", { format: formatRegExp(MINIMAP), trim: true })
  minimap: MinimapValue = "hide";

  @serializable("string", { format: formatRegExp(RENDER_WHITESPACE), trim: true })
  renderWhitespace: RenderWhitespaceValue = "none";

  getMonacoEditorSettings(): object {
    return {
      minimap: {
        enabled: this.minimap === "show" || this.minimap === "auto",
      },
      renderWhitespace: this.renderWhitespace,
    };
  }

  clone(): Readonly<EditorSettings> {
    return Object.freeze(Object.assign(new EditorSettings(), this));
  }

  [immerable] = true;
}

export class UserSettings {
  /**
   * The size of the sidebar in pixels.
   */
  @serializable("integer")
  sidebarSize: number;

  @serializable("string", { format: formatRegExp(COLOR_SCHEME), trim: true })
  colorScheme: ColorScheme = "auto";

  @serializable("boolean")
  telemetry: boolean = true;

  @serializable("boolean")
  showRecentlyOpened: boolean = true;

  @serializable("boolean")
  showFavorites: boolean = true;

  @serializable("boolean")
  showFileExtensions: boolean = false;

  @serializable("object", { factory: EditorSettings })
  editor: EditorSettings = new EditorSettings();

  clone(): Readonly<UserSettings> {
    return Object.freeze(Object.assign(new UserSettings(), this, { editor: this.editor.clone() }));
  }

  /**
   * Calculate the color scheme of the application based on the given preference.
   *
   * @param colorScheme the color scheme preference.
   * @returns the given color scheme if it is not "auto", otherwise the system preference.
   */
  static calculateColorScheme(colorScheme: ColorScheme): "light" | "dark" {
    if (colorScheme === "auto") {
      return env.colorScheme;
    }
    return colorScheme;
  }

  [immerable] = true;
}
