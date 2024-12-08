import { KeyboardShortcut, SVGIcon } from "@/utils/types";
import { env } from "@/utils/env";
import { raise } from "@/utils/telemetry";

type CommandAction = (command: string) => void;

export type Command = {
  readonly name: string;
  readonly label?: string;
  readonly description: string;
  readonly shortcut?: KeyboardShortcut;
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
 * Register one or more commands.
 *
 * A command can be registered only once, if a command with the same name is already registered, a warning is logged.
 *
 * @param command The command to register.
 * @returns A function to unregister the commands.
 */
export function registerCommand(...command: Command[]): () => void {
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
  return () => {
    command.forEach((c) => {
      delete commands[c.name];
    });
  };
}

/**
 * Get the command with the given name.
 *
 * This method can be called with `undefined` and will just return `undefined` in that scenario.
 *
 * @param name - Name of the command to get (ex: "clipboard.copy")
 * @returns The command with the given name or undefined name was undefined.
 * @throws An error if the command with the given name is not registered.
 */
export function getCommand(name: string | undefined): Command {
  const command = commands[name];
  if (!command && name !== undefined) {
    raise(`Command '${name}' not registered`);
  } else {
    return command;
  }
}

export function registerAction(command: string, callback: CommandAction): Command {
  const c = commands[command];
  if (!c) {
    raise(`Command '${command}' not registered`);
  } else if (c.actions.includes(callback)) {
    raise(`The given action is already registered for the command '${command}'`);
  } else {
    c.actions.push(callback);
    return c;
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
    executeActions(c, c.actions);
  }
}

export function registerGlobalKeyListeners() {
  window.addEventListener("keydown", (event) => {
    // If the shortcut involves a combination of modifier keys, the order is: Ctrl, Alt, Shift, Meta.
    const shortcut = getShortcut(event);
    if (shortcut) {
      const command = Object.values(commands).find((c) => c.shortcut === shortcut);
      if (command) {
        dispatchCommand(command.name, event);
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
  // Matching the key code to a character when possible.
  // https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values
  const codeMatch = event.code.match(/^(Key|Digit|Numpad)([A-Z0-9])/);
  if (codeMatch) {
    keys.push(codeMatch[2]);
  } else {
    switch (event.code) {
      case "Minus":
        keys.push("-");
        break;
      case "Equal":
        keys.push("=");
        break;
      case "BracketLeft":
        keys.push("[");
        break;
      case "BracketRight":
        keys.push("]");
        break;
      case "Semicolon":
        keys.push(";");
        break;
      case "Quote":
        keys.push("'");
        break;
      case "Backquote":
        keys.push("`");
        break;
      case "Backslash":
        keys.push("\\");
        break;
      case "Comma":
        keys.push(",");
        break;
      case "Period":
        keys.push(".");
        break;
      case "Slash":
        keys.push("/");
        break;
      case "NumpadMultiply":
        keys.push("*");
        break;
      case "NumpadSubtract":
        keys.push("-");
        break;
      case "NumpadAdd":
        keys.push("+");
        break;
      case "NumpadDecimal":
        keys.push(".");
        break;
      case "NumpadDivide":
        keys.push("/");
        break;
      case "NumpadEnter":
        keys.push("Enter");
        break;
      case "NumpadEqual":
        keys.push("=");
        break;
      default:
        keys.push(event.code);
        break; // Enter, Escape, ArrowUp, ArrowRight, ...
    }
  }
  console.debug(`Shortcut: ${keys.join("+")}`);
  return keys.join("+");
}

function executeActions(command: Command, actions: CommandAction[]) {
  actions.forEach((action) => action(command.name));
}

registerCommand(
  { name: "clipboard.copy", label: "Copy", description: "Copy selected text", shortcut: ["Meta+C", "Ctrl+C"] },
  { name: "clipboard.paste", label: "Paste", description: "Paste text", shortcut: ["Meta+V", "Ctrl+V"] },
  { name: "clipboard.cut", label: "Cut", description: "Cut selected text", shortcut: ["Meta+X", "Ctrl+X"] },
);

registerGlobalKeyListeners();

/**
 * The detail of a command event.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CustomEvent/detail)
 */
export type CommandEventDetail = {
  name: string;
};

/**
 * A custom command event suitable for the DOM `dispatchEvent()` method.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CustomEvent)
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/dispatchEvent)
 */
export type CommandEvent = CustomEvent<CommandEventDetail>;

/**
 * Dispatch a command event from the given command name.
 *
 * The command event is dispatched on the active element.
 *
 * @param name - The name of the command to dispatch.
 * @throws An error if there is no active element to dispatch the command.
 */
export function dispatchCommand(name: string, event?: Event) {
  const target = findCommandTarget(event?.target || document.activeElement);
  if (target) {
    const command = getCommand(name);
    console.debug("Dispatching command", { name, target });
    const detail: CommandEventDetail = { name: command.name };
    const commandEvent = new CustomEvent("command", { bubbles: true, detail });
    target.dispatchEvent(commandEvent);
    if (commandEvent.defaultPrevented) {
      event?.preventDefault();
      event?.stopPropagation();
    }
  } else {
    raise(`No active element to dispatch command '${name}'`);
  }
}

/**
 * Find a valid command target in the given target and its children.
 *
 * A valid command target is an element that can take the focus is not hidden.
 */
function findCommandTarget(target: EventTarget): EventTarget {
  while (target && target instanceof HTMLElement) {
    if (target.tabIndex !== -1) {
      const computedStyle = window.getComputedStyle(target);
      if (computedStyle.display !== "none" && computedStyle.visibility !== "hidden") {
        return target;
      }
    } else if (target.children.length) {
      for (const child of target.children) {
        target = findCommandTarget(child);
        if (target) {
          break;
        }
      }
    } else {
      target = null;
    }
  }
  return target;
}
