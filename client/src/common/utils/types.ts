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
 * If the shortcut differs between macOS and Windows/Linux, the macOS shortcut is written first.
 * The  'Command' (⌘) and 'Windows' (⊞) keys are written as 'Meta'.
 * i.e. `Ctrl+C` on Windows/Linux and `Meta+C` on macOS.
 */
export type KeyboardShortcut = [string, string] | string;
