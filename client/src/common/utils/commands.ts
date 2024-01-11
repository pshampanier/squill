import { KeyboardShortcut, SVGIcon } from "@/utils/types";
import { env } from "@/utils/env";
import { raise } from "@/utils/telemetry";
import SettingsIcon from "@/icons/settings.svg?react";

type CommandAction = () => void;

export type Command = {
  readonly name: string;
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
        // If the shortcut differs between macOS and Windows/Linux, we keep only the shortcut for the current plateform.
        shortcut = shortcut[env.plateform === "macos" ? 0 : 1];
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
    // If the shortcut involves a combinaison of modifier keys, the order is: Ctrl, Alt, Shift, Meta.
    const shortcut = getShortcut(event);
    if (shortcut) {
      const command = Object.values(commands).find((c) => c.shortcut === shortcut);
      if (command) {
        event.preventDefault();
        executeActions(command.actions);
      }
    }
  });
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
  { name: "settings", description: "Open settings", shortcut: ["Meta+,", "Ctrl+,"], icon: SettingsIcon }
);

registerGlobalKeyListeners();
