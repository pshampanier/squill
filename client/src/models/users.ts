import { serializable } from "@/utils/serializable";
import { Variable } from "@/models/variables";
import { UserSettings } from "@/models/user-settings";

const COLOR_SCHEME = ["light", "dark", "auto"] as const;
const MINIMAP = ["show", "hide", "auto"] as const;
const RENDER_WHITESPACE = ["all", "none", "boundary", "selection", "trailing"] as const;

export type ColorScheme = (typeof COLOR_SCHEME)[number];
export type RenderWhitespaceValue = (typeof RENDER_WHITESPACE)[number];
export type MinimapValue = (typeof MINIMAP)[number];

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
