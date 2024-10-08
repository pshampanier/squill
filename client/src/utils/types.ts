export type ObjectFactoryFunction<T extends object> = (...args: unknown[]) => T;
export type ObjectFactoryConstructor<T extends object> = new (...args: unknown[]) => T;
export type ObjectFactory<T extends object> = ObjectFactoryConstructor<T> | ObjectFactoryFunction<T>;

export type SVGIcon = React.FunctionComponent<React.SVGProps<SVGSVGElement>>;

/**
 * A type that represent a locale.
 *
 * As for now, only the "en-US" locale is supported but later on, more locales will be added such as "fr-FR", "es-ES",...
 */
export type Locale = "en-US";

/**
 * A keyboard shortcut is a string that represents a key combination.
 *
 * The string is a list of keys separated by a `+` sign.
 * If the key is a modifier key, it is written starting with an uppercase letter followed by lowercase (Ctrl, Shift,
 * ...), otherwise it is written in uppercase.
 * If the shortcut is a combination of keys, the keys are written in alphabetical order.
 * If the shortcut is a single key, it is written as is.
 * If the shortcut differs between macOS and Windows/Linux, the shortcut must be an array of two strings, the first
 * begin the maxOS shortcut and the second the Windows/Linux shortcut (ex: ["Meta+C", "Ctrl+C"]).
 * The  'Command' (⌘) and 'Windows' (⊞) keys are written as 'Meta'.
 * If the shortcut involves a combination of modifier keys, the order is: Ctrl, Alt, Shift, Meta.
 *
 * If the shortcut differs between the desktop application and the web browser, the shortcut must be an array of two
 * arrays, the first being the desktop application shortcut and the second the web browser shortcut. This is useful
 * when the shortcut is reserved by a web browser such has ⌘T (open a new tab) or ⌘W (close the current tab).
 *
 * ```
 *
 *                                  Windows/Linux
 *                                              │
 *                          all     macOS       │
 *                            │         │       │           Desktop             Web
 *                            ▼         ▼       ▼        ──────────────    ──────────────
 * type KeyboardShortcut = string | [string, string] | [[string, string], [string, string]]
 * ```
 *
 * Special keys are written as follow:
 *
 * - Escape
 * - Enter
 * - Delete
 * - ArrowUp
 * - ArrowRight
 * - ArrowDown
 * - ArrowLeft
 * - Enter
 * - PageUp
 * - PageDown
 * - F11..F19
 * - CapsLock
 * - Tab
 * - Clear
 * - Home
 * - End
 *
 * IMPORTANT: The shortcut is case sensitive.
 *
 * @example
 * - "Ctrl+Shift+M": the shortcut is Ctrl+Shift+M on all platforms.
 * - ["Meta+M", "Ctrl+M"]: the shortcut is Meta+M on macOS and Ctrl+M on Windows/Linux.
 * - [["Meta+M", "Ctrl+M"], ["Meta+Shift+M", "Ctrl+Shift+M"]]: the shortcut is Meta+M on macOS and Ctrl+M on
 *   Windows/Linux for the desktop application but Meta+Shift+M on macOS and Ctrl+Shift+M on Windows/Linux in a web
 *   browser.
 */
export type KeyboardShortcut = string | [string, string] | [[string, string], [string, string]];

/**
 * DeepPartial<T> is a recursive type that makes every property in T optional. If a property is an array, it makes every
 * item in the array a DeepPartial. If a property is an object, it makes every property in that object a DeepPartial.
 * This continues recursively for all nested objects and arrays.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends ReadonlyArray<infer U>
      ? ReadonlyArray<DeepPartial<U>>
      : T[P] extends object
        ? DeepPartial<T[P]>
        : T[P];
};

/**
 * List of application spaces
 */
export type ApplicationSpace = "logon" | "user" | "workspace";
