import { formatRegExp, serializable } from "@/utils/serializable";

const THEME = ["light", "dark"] as const;
const MINIMAP = ["show", "hide", "auto"] as const;
const RENDER_WHITESPACE = ["all", "none", "boundary", "selection", "trailing"] as const;

type RenderWhitespace = (typeof RENDER_WHITESPACE)[number];
type Minimap = (typeof MINIMAP)[number];
type Theme = (typeof THEME)[number];

class EditorSettings {
  @serializable("string", { format: formatRegExp(MINIMAP), trim: true })
  minimap: Minimap = "hide";

  @serializable("string", { format: formatRegExp(RENDER_WHITESPACE), trim: true })
  renderWhitespace: RenderWhitespace = "none";

  getMonacoEditorSettings(): object {
    return {
      minimap: {
        enabled: this.minimap === "show" || this.minimap === "auto",
      },
      renderWhitespace: this.renderWhitespace,
    };
  }
}

export class UserSettings {
  @serializable("string", { format: formatRegExp(THEME), trim: true })
  theme: Theme = "light";

  @serializable("boolean")
  telemetry: boolean = true;

  @serializable("boolean")
  showRecentlyOpened: boolean = true;

  @serializable("boolean")
  showFavorites: boolean = true;

  @serializable("object", { factory: EditorSettings })
  editor: EditorSettings = new EditorSettings();
}
