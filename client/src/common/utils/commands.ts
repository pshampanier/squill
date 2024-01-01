import { KeyboardShortcut, SVGIcon } from "@/utils/types";
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
      commands[c.name] = { ...c, actions: [] };
    }
  });
}

export function getCommand(name: string): Command {
  const command = commands[name];
  if (!command) {
    throw new Error(`Command '${name}' not registered`);
  } else {
    return command;
  }
}

export function registerAction(command: string, callback: CommandAction) {
  const c = commands[command];
  if (!c) {
    throw new Error(`Command '${command}' not registered`);
  } else if (c.actions.includes(callback)) {
    throw new Error(`The given action is already registered for the command '${command}'`);
  } else {
    c.actions.push(callback);
  }
}

export function unregisterAction(command: string, callback: CommandAction) {
  const c = commands[command];
  if (!c) {
    throw new Error(`Command '${command}' not registered`);
  } else {
    const index = c.actions.indexOf(callback);
    if (index === -1) {
      throw new Error(`The given action is not registered for the command '${command}'`);
    } else {
      c.actions.splice(index, 1);
    }
  }
}

export function executeCommand(name: string) {
  const c = commands[name];
  if (!c) {
    throw new Error(`Command '${name}' not registered`);
  } else {
    c.actions.forEach((action) => action());
  }
}

registerCommand(
  { name: "clipboard.copy", description: "Copy selected text", shortcut: ["Meta+C", "Ctrl+C"] },
  { name: "clipboard.paste", description: "Paste text", shortcut: ["Meta+V", "Ctrl+V"] },
  { name: "clipboard.cut", description: "Cut selected text", shortcut: ["Meta+X", "Ctrl+X"] },
  { name: "settings", description: "Open settings", shortcut: ["Meta+,", "Ctrl+,"], icon: SettingsIcon }
);
