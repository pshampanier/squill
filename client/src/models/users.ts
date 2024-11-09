import { formatRegExp, serializable } from "@/utils/serializable";
import { immerable } from "immer";
import { Variable } from "@/models/variables";
import { TableSettings } from "@/models/user-settings";

const COLOR_SCHEME = ["light", "dark", "auto"] as const;
const MINIMAP = ["show", "hide", "auto"] as const;
const RENDER_WHITESPACE = ["all", "none", "boundary", "selection", "trailing"] as const;

export type ColorScheme = (typeof COLOR_SCHEME)[number];
export type RenderWhitespaceValue = (typeof RENDER_WHITESPACE)[number];
export type MinimapValue = (typeof MINIMAP)[number];

export class EditorSettings {
  [immerable] = true;

  @serializable("string", { snakeCase: "property", format: formatRegExp(MINIMAP), trim: true })
  minimap: MinimapValue = "hide";

  @serializable("string", { snakeCase: "property", format: formatRegExp(RENDER_WHITESPACE), trim: true })
  renderWhitespace: RenderWhitespaceValue = "none";

  constructor(object?: Partial<EditorSettings>) {
    Object.assign(this, object ?? {});
  }
}

export class UserSettings {
  [immerable] = true;

  @serializable("string", { snakeCase: "property", format: formatRegExp(COLOR_SCHEME), trim: true })
  colorScheme: ColorScheme = "auto";

  @serializable("boolean")
  telemetry: boolean = true;

  @serializable("boolean", { snakeCase: "property" })
  showRecentlyOpened: boolean = true;

  @serializable("boolean", { snakeCase: "property" })
  showFavorites: boolean = true;

  @serializable("boolean", { snakeCase: "property" })
  showFileExtensions: boolean = false;

  @serializable("object", { snakeCase: "property", factory: EditorSettings })
  editorSettings: EditorSettings = new EditorSettings();

  @serializable("object", { snakeCase: "property", factory: TableSettings })
  tableSettings: TableSettings = new TableSettings();

  constructor(object?: Partial<UserSettings>) {
    Object.assign(this, object);
    this.editorSettings = new EditorSettings(object?.editorSettings);
  }
}

export class User {
  @serializable("string", { required: true })
  username!: string;

  @serializable("string", { snakeCase: "property", required: true })
  userId!: string;

  @serializable("object", { factory: UserSettings })
  settings: UserSettings = new UserSettings();

  @serializable("object", { factory: Variable })
  variables?: Variable[];

  constructor(object?: Partial<User>) {
    Object.assign(this, object);
    this.settings = new UserSettings(object?.settings);
    this.variables = object?.variables?.map((v) => new Variable(v));
  }
}
