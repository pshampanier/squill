export type ObjectFactoryFunction<T extends object> = (...args: unknown[]) => T;
export type ObjectFactoryConstructor<T extends object> = new (...args: unknown[]) => T;
export type ObjectFactory<T extends object> = ObjectFactoryConstructor<T> | ObjectFactoryFunction<T>;

export type SVGIcon = React.FunctionComponent<React.SVGProps<SVGSVGElement>>;

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
 * If the shortcut involves a combinaison of modifier keys, the order is: Ctrl, Alt, Shift, Meta.
 * Special keys are written as follow:
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
 */
export type KeyboardShortcut = [string, string] | string;
