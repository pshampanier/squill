import { test, expect, vi } from "vitest";
import { registerCommand, getCommand, registerAction, executeCommand, unregisterAction } from "@/utils/commands";

test("registerCommand", () => {
  // 1. Register a command and expect it to be available.
  registerCommand({
    name: "command1",
    description: "Command 1",
    shortcut: "ctrl+shift+1",
  });
  expect(getCommand("command1")).toEqual({
    name: "command1",
    description: "Command 1",
    shortcut: "ctrl+shift+1",
    actions: [],
  });

  // 2. Register a command twice and expect a warning.
  const spy = vi.spyOn(console, "warn");
  registerCommand({
    name: "command1",
    description: "Command 1",
    shortcut: "ctrl+shift+1",
  });
  expect(spy).toHaveBeenCalledTimes(1);
});

test("getCommand", () => {
  // 1. Get a command that doesn't exist and expect undefined.
  expect(() => getCommand("command2")).toThrowError("Command 'command2' not registered");
});

test("registerAction", () => {
  // 1. Register an action for a command and expect it to be available.
  const action1 = vi.fn(() => {});
  const action2 = vi.fn(() => {});
  registerCommand({
    name: "command3",
    description: "Command 3",
    shortcut: "ctrl+shift+3",
  });
  registerAction("command3", action1);
  registerAction("command3", action2);
  executeCommand("command3");
  expect(action1).toHaveBeenCalled();
  expect(action2).toHaveBeenCalled();

  // 2. Register the same action twice and expect an error.
  expect(() => registerAction("command3", action1)).toThrowError(
    "The given action is already registered for the command 'command3'"
  );

  // 3. Register an action for a command that doesn't exist and expect an error.
  expect(() => registerAction("command4", action1)).toThrowError("Command 'command4' not registered");
});

test("executeCommand", () => {
  // 1. Execute a command that doesn't exist and expect an error.
  expect(() => executeCommand("command5")).toThrowError("Command 'command5' not registered");
});

test("unregisterAction", () => {
  // 1. Unregister an action for a command and expect it to be unavailable.
  const action1 = vi.fn(() => {});
  const action2 = vi.fn(() => {});
  registerCommand({
    name: "command6",
    description: "Command 6",
    shortcut: "ctrl+shift+6",
  });
  registerAction("command6", action1);
  registerAction("command6", action2);
  unregisterAction("command6", action1);
  executeCommand("command6");
  expect(action1).not.toHaveBeenCalled();
  expect(action2).toHaveBeenCalled();

  // 2. Unregister an action for a command that doesn't exist and expect an error.
  expect(() => unregisterAction("command7", action2)).toThrowError("Command 'command7' not registered");

  // 3. Unregister an action that is not registered and expect an error.
  expect(() => unregisterAction("command6", action1)).toThrowError(
    "The given action is not registered for the command 'command6'"
  );
});
