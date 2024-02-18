import { KeyboardShortcut, SVGIcon } from "@/utils/types";
import { env } from "@/utils/env";
import { raise } from "@/utils/telemetry";
import SettingsIcon from "@/icons/settings.svg?react";
import CloseIcon from "@/icons/close.svg?react";

type CommandAction = () => void;

export type Command = {
  readonly name: string;
  readonly label?: string;
  readonly description: string;
  readonly shortcut: KeyboardShortcut;
  readonly icon?: SVGIcon;
};

type CommandWithActions = Command & {
  actions: CommandAction[];
};

/**
 * The list of all registered commands.
 */
const commands: { [name: string]: CommandWithActions } = {};

/**
 * Register a command.
 *
 * A command can be registered only once, if a command with the same name is already registered, an error is thrown.
 *
 * @param command The command to register.
 */
export function registerCommand(...command: Command[]) {
  command.forEach((c) => {
    if (commands[c.name]) {
      // When a command is registered twice, it means that the command is registered in two different places (which is
      // a bug and should be fixed) or the module has been reloaded (hot reload in debug).
      console.warn(`Command '${c.name}' already registered`);
    } else {
      let shortcut = c.shortcut;
      if (Array.isArray(shortcut)) {
        if (Array.isArray(shortcut[0])) {
          // If the shortcut differs between the desktop application and the web browser, we keep only the shortcut for
          // the current environment.
          shortcut = shortcut[env.applicationType === "desktop" ? 0 : 1];
        }
        // If the shortcut differs between macOS and Windows/Linux, we keep only the shortcut for the current platform.
        shortcut = shortcut[env.platform === "macos" ? 0 : 1];
      }
      commands[c.name] = { ...c, shortcut: shortcut, actions: [] };
    }
  });
}

export function getCommand(name: string): Command {
  const command = commands[name];
  if (!command) {
    raise(`Command '${name}' not registered`);
  } else {
    return command;
  }
}

export function registerAction(command: string, callback: CommandAction) {
  const c = commands[command];
  if (!c) {
    raise(`Command '${command}' not registered`);
  } else if (c.actions.includes(callback)) {
    raise(`The given action is already registered for the command '${command}'`);
  } else {
    c.actions.push(callback);
  }
}

/**
 * Register the given action for the given command if it is not already registered.
 *
 * @param command The command to register the action for.
 * @param callback The action to register.
 * @returns `true` if the action was registered, `false` if it was already registered.
 */
export function registerActionIfNeeded(command: string, callback: CommandAction): boolean {
  const c = commands[command];
  if (!c) {
    raise(`Command '${command}' not registered`);
  } else if (!c.actions.includes(callback)) {
    c.actions.push(callback);
    return true;
  } else {
    return false;
  }
}

export function unregisterAction(command: string, callback: CommandAction) {
  const c = commands[command];
  if (!c) {
    raise(`Command '${command}' not registered`);
  } else {
    const index = c.actions.indexOf(callback);
    if (index === -1) {
      raise(`The given action is not registered for the command '${command}'`);
    } else {
      c.actions.splice(index, 1);
    }
  }
}

export function executeCommand(name: string) {
  const c = commands[name];
  if (!c) {
    raise(`Command '${name}' not registered`);
  } else {
    executeActions(c.actions);
  }
}

export function registerGlobalKeyListeners() {
  window.addEventListener("keydown", (event) => {
    // If the shortcut involves a combination of modifier keys, the order is: Ctrl, Alt, Shift, Meta.
    const shortcut = getShortcut(event);
    if (shortcut) {
      const command = Object.values(commands).find((c) => c.shortcut === shortcut);
      if (command) {
        event.preventDefault();
        console.debug(`Executing command '${command.name}'`);
        executeActions(command.actions);
      }
    }
  });
}

/**
 * Extract the actual shortcut for the current environment from the given shortcuts.
 *
 * A shortcuts can be a string, an array of two strings or an array of two arrays of two strings defined as follow:
 *
 * ```
 *           Windows/Linux
 *                       │
 *   all     macOS       │
 *     │         │       │           Desktop             Web
 *     ▼         ▼       ▼        ──────────────    ──────────────
 *  string | [string, string] | [[string, string], [string, string]]
 * ```
 *
 * This method will return the string representing the shortcut for the current environment.
 */
export function getCurrentEnvironmentShortcut(shortcuts: KeyboardShortcut): string {
  let shortcut = shortcuts;
  if (Array.isArray(shortcut)) {
    if (Array.isArray(shortcut[0])) {
      // If the shortcut differs between the desktop application and the web browser, we keep only the shortcut for
      // the current environment.
      shortcut = shortcut[env.applicationType === "desktop" ? 0 : 1];
    }
    // If the shortcut differs between macOS and Windows/Linux, we keep only the shortcut for the current platform.
    shortcut = shortcut[env.platform === "macos" ? 0 : 1];
  }
  return shortcut as string;
}

/**
 * Transform a KeyboardEvent into a shortcut string.
 *
 * @param event the KeyboardEvent to transform.

* @returns a string representing the shortcut (ex: "Alt+Meta+F") or null if the event does not represent a shortcut.
 */
function getShortcut(event: KeyboardEvent): string {
  if (!event.key) return null; // A shortcut must have a key.
  const keys: string[] = [];
  event.ctrlKey && keys.push("Ctrl");
  event.altKey && keys.push("Alt");
  event.shiftKey && keys.push("Shift");
  event.metaKey && keys.push("Meta");
  keys.push(event.key.length === 1 ? event.key.toUpperCase() : event.key);
  return keys.join("+");
}

function executeActions(actions: CommandAction[]) {
  actions.forEach((action) => action());
}

registerCommand(
  { name: "clipboard.copy", description: "Copy selected text", shortcut: ["Meta+C", "Ctrl+C"] },
  { name: "clipboard.paste", description: "Paste text", shortcut: ["Meta+V", "Ctrl+V"] },
  { name: "clipboard.cut", description: "Cut selected text", shortcut: ["Meta+X", "Ctrl+X"] },
  { name: "settings.open", description: "Open settings", shortcut: ["Meta+,", "Ctrl+,"], icon: SettingsIcon },
  { name: "settings.close", description: "Close", shortcut: "Escape", icon: CloseIcon }
);

registerGlobalKeyListeners();
