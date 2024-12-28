/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 ********************************************************************/
import { formatRegExp, serializable } from "@/utils/serializable";
import { immerable } from "immer";


/**
 * The color scheme of the application.
 */
export const COLOR_SCHEME_VALUES = ["light", "dark", "auto"] as const;
export type ColorScheme = (typeof COLOR_SCHEME_VALUES)[number];

/**
 * The density of a table.
 */
export const TABLE_DENSITY_VALUES = ["compact", "comfortable"] as const;
export type TableDensity = (typeof TABLE_DENSITY_VALUES)[number];

/**
 * The dividers between columns & rows in a table.
 */
export const TABLE_DIVIDERS_VALUES = ["none", "rows", "grid"] as const;
export type TableDividers = (typeof TABLE_DIVIDERS_VALUES)[number];

/**
 * The overscan of a table.
 */
export const TABLE_OVERSCAN_VALUES = ["small", "medium", "large"] as const;
export type TableOverscan = (typeof TABLE_OVERSCAN_VALUES)[number];

/**
 * The visual representation of null values.
 */
export const NULL_VALUES_VALUES = ["null_lowercase", "null_uppercase", "empty", "dash", "not_available_lowercase", "not_available_uppercase"] as const;
export type NullValues = (typeof NULL_VALUES_VALUES)[number];

/**
 * The minimap visibility of the Monaco Editor.
 */
export const MONACO_EDITOR_MINIMAP_VALUES = ["show", "hide", "auto"] as const;
export type MonacoEditorMinimap = (typeof MONACO_EDITOR_MINIMAP_VALUES)[number];

/**
 * The whitespace rendering of the Monaco Editor.
 */
export const MONACO_EDITOR_WHITESPACE_VALUES = ["none", "boundary", "selection", "all", "trailing"] as const;
export type MonacoEditorWhitespace = (typeof MONACO_EDITOR_WHITESPACE_VALUES)[number];

/**
 * The cursor style of the Monaco Editor.
 */
export const MONACO_EDITOR_CURSOR_STYLE_VALUES = ["line", "block", "underline", "line_thin", "block_outline", "underline_thin"] as const;
export type MonacoEditorCursorStyle = (typeof MONACO_EDITOR_CURSOR_STYLE_VALUES)[number];

/**
 * The match brackets setting of the Monaco Editor.
 */
export const MONACO_EDITOR_MATCH_BRACKETS_VALUES = ["always", "never", "near"] as const;
export type MonacoEditorMatchBrackets = (typeof MONACO_EDITOR_MATCH_BRACKETS_VALUES)[number];


/**
 * The settings of the Monaco Editor used by the terminal, worksheet, etc.
 **/
export class MonacoEditorSettings {
  [immerable] = true;
  
  /**
   * The cursor style of the Monaco Editor.
   **/
  @serializable("string", { format: formatRegExp(MONACO_EDITOR_CURSOR_STYLE_VALUES), required: true, snakeCase: "property" })
  cursorStyle!: MonacoEditorCursorStyle;
  
  /**
   * Insert spaces when pressing Tab.
   **/
  @serializable("boolean", { required: true, snakeCase: "property" })
  insertSpaces!: boolean;
  
  /**
   * The match brackets setting of the Monaco Editor.
   **/
  @serializable("string", { format: formatRegExp(MONACO_EDITOR_MATCH_BRACKETS_VALUES), required: true, snakeCase: "property" })
  matchBrackets!: MonacoEditorMatchBrackets;
  
  /**
   * The minimap visibility of the Monaco Editor.
   **/
  @serializable("string", { format: formatRegExp(MONACO_EDITOR_MINIMAP_VALUES), required: true })
  minimap!: MonacoEditorMinimap;
  
  /**
   * Size of a tab in spaces.
   **/
  @serializable("integer", { required: true, min: 1, snakeCase: "property" })
  tabSize!: number;
  
  /**
   * The whitespace rendering of the Monaco Editor.
   **/
  @serializable("string", { format: formatRegExp(MONACO_EDITOR_WHITESPACE_VALUES), required: true })
  whitespace!: MonacoEditorWhitespace;
  
  constructor(object?: Partial<MonacoEditorSettings>) {
    Object.assign(this, object);
  }
}

/**
 * The settings of a table displaying a dataframe.
 **/
export class TableSettings {
  [immerable] = true;
  
  /**
   * The density of the table.
   **/
  @serializable("string", { format: formatRegExp(TABLE_DENSITY_VALUES), required: true })
  density!: TableDensity;
  
  /**
   * The dividers between columns & rows in the table.
   **/
  @serializable("string", { format: formatRegExp(TABLE_DIVIDERS_VALUES), required: true })
  dividers!: TableDividers;
  
  /**
   * The maximum number of characters to display in a column.
   **/
  @serializable("integer", { required: true, min: 0, snakeCase: "property" })
  maxLength!: number;
  
  /**
   * The visual representation of null values.
   **/
  @serializable("string", { format: formatRegExp(NULL_VALUES_VALUES), required: true, snakeCase: "property" })
  nullValues!: NullValues;
  
  /**
   * The overscan of the table.
   **/
  @serializable("string", { format: formatRegExp(TABLE_OVERSCAN_VALUES), required: true })
  overscan!: TableOverscan;
  
  /**
   * Show the row numbers in the table.
   **/
  @serializable("boolean", { required: true, snakeCase: "property" })
  showRowNumbers!: boolean;
  
  constructor(object?: Partial<TableSettings>) {
    Object.assign(this, object);
  }
}

/**
 * The settings of a terminal.
 **/
export class TerminalSettings {
  [immerable] = true;
  
  /**
   * The settings of the Monaco Editor used by the history view.
   **/
  @serializable("object", { factory: MonacoEditorSettings, required: true, snakeCase: "property" })
  editorSettings!: MonacoEditorSettings;
  
  constructor(object?: Partial<TerminalSettings>) {
    Object.assign(this, object);
    this.editorSettings = object?.editorSettings && new MonacoEditorSettings(object.editorSettings);
  }
}

/**
 * The settings of the history view.
 **/
export class HistorySettings {
  [immerable] = true;
  
  /**
   * The maximum age of the entries in the history (in days).
   **/
  @serializable("integer", { required: true, min: 0, snakeCase: "property" })
  maxAge!: number;
  
  /**
   * The maximum number of entries in the history.
   **/
  @serializable("integer", { required: true, min: 0, snakeCase: "property" })
  maxEntries!: number;
  
  /**
   * The maximum number of rows to display in the result set.
   **/
  @serializable("integer", { required: true, min: 5, snakeCase: "property" })
  maxRows!: number;
  
  /**
   * The maximum storage of the history (in megabytes).
   **/
  @serializable("integer", { required: true, min: 0, snakeCase: "property" })
  maxStorage!: number;
  
  /**
   * The settings of the table displaying the result set.
   **/
  @serializable("object", { factory: TableSettings, required: true, snakeCase: "property" })
  tableSettings!: TableSettings;
  
  constructor(object?: Partial<HistorySettings>) {
    Object.assign(this, object);
    this.tableSettings = object?.tableSettings && new TableSettings(object.tableSettings);
  }
}

/**
 * The regional settings of the application.
 **/
export class RegionalSettings {
  [immerable] = true;
  
  /**
   * The locale of the application.
   **/
  @serializable("string", { required: true })
  locale!: string;
  
  /**
   * Use the system settings for the regional settings.
   **/
  @serializable("boolean", { snakeCase: "property" })
  useSystem?: boolean;
  
  constructor(object?: Partial<RegionalSettings>) {
    Object.assign(this, object);
  }
}

/**
 * The settings of a user.
 **/
export class UserSettings {
  [immerable] = true;
  
  /**
   * The color scheme of the application.
   **/
  @serializable("string", { format: formatRegExp(COLOR_SCHEME_VALUES), required: true, snakeCase: "property" })
  colorScheme!: ColorScheme;
  
  /**
   * The settings of the Monaco Editor used by worksheet and files.
   **/
  @serializable("object", { factory: MonacoEditorSettings, required: true, snakeCase: "property" })
  editorSettings!: MonacoEditorSettings;
  
  /**
   * The settings of the history view.
   **/
  @serializable("object", { factory: HistorySettings, required: true, snakeCase: "property" })
  historySettings!: HistorySettings;
  
  /**
   * The visual representation of null values.
   **/
  @serializable("string", { format: formatRegExp(NULL_VALUES_VALUES), required: true, snakeCase: "property" })
  nullValues!: NullValues;
  
  /**
   * The regional settings of the application.
   **/
  @serializable("object", { factory: RegionalSettings, required: true, snakeCase: "property" })
  regionalSettings!: RegionalSettings;
  
  /**
   * Show the favorites in the catalog.
   **/
  @serializable("boolean", { required: true, snakeCase: "property" })
  showFavorites!: boolean;
  
  /**
   * Enable/Disable the telemetry.
   **/
  @serializable("boolean", { required: true })
  telemetry!: boolean;
  
  /**
   * The settings of the terminal.
   **/
  @serializable("object", { factory: TerminalSettings, required: true, snakeCase: "property" })
  terminalSettings!: TerminalSettings;
  
  constructor(object?: Partial<UserSettings>) {
    Object.assign(this, object);
    this.editorSettings = object?.editorSettings && new MonacoEditorSettings(object.editorSettings);
    this.historySettings = object?.historySettings && new HistorySettings(object.historySettings);
    this.regionalSettings = object?.regionalSettings && new RegionalSettings(object.regionalSettings);
    this.terminalSettings = object?.terminalSettings && new TerminalSettings(object.terminalSettings);
  }
}