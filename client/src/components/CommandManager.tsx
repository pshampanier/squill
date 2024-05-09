import { useAppStore } from "@/stores/AppStore";
import { registerAction, registerCommand, unregisterAction } from "@/utils/commands";
import { useEffect } from "react";

registerCommand(
  {
    name: "connection.new",
    description: "New Connection",
    shortcut: "Ctrl+Alt+C",
  },
  {
    name: "tab.new",
    description: "New Tab",
    shortcut: [
      ["Meta+N", "Ctrl+N"], // Desktop
      ["Alt+Meta+N", "Ctrl+Alt+N"], // Web
    ],
  },
  {
    name: "tab.close",
    description: "Close Tab",
    shortcut: [
      ["Meta+W", "Ctrl+W"], // Desktop
      ["Alt+Shift+Meta+N", "Ctrl+Alt+N"], // Web
    ],
  }
);

export default function CommandManager() {
  const handleCommand = (command: string) => {
    switch (command) {
      case "tab.new": {
        useAppStore.getState().addBlankPage();
        break;
      }
      case "tab.close": {
        useAppStore.getState().closePage(useAppStore.getState().activePageId);
        break;
      }
    }
  };

  useEffect(() => {
    const commands = [registerAction("tab.new", handleCommand), registerAction("tab.close", handleCommand)];
    return () => {
      commands.forEach((command) => unregisterAction(command.name, handleCommand));
    };
  });
  return <div />;
}
