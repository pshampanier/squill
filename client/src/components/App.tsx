import "@/components/editors/index.tsx";
import { useCallback, useRef } from "react";
import { useAppStore } from "@/stores/AppStore";
import { CommandEvent, registerCommand } from "@/utils/commands";
import { useCommand } from "@/hooks/use-commands";
import LogonSpace from "@/components/spaces/LogonSpace";
import UserSpace from "@/components/spaces/UserSpace";
import SettingsSpace from "@/components/spaces/settings/SettingsSpace";
import ApplySystemPreferences from "@/components/ApplySystemPreferences";
import SettingsIcon from "@/icons/settings.svg?react";
import CloseIcon from "@/icons/close.svg?react";

registerCommand(
  {
    name: "settings.open",
    description: "Open settings",
    shortcut: [
      ["Meta+,", "Ctrl+,"], // Desktop
      ["Alt+Meta+,", "Ctrl+Alt+,"], // Web
    ],
    icon: SettingsIcon,
  },
  { name: "settings.close", description: "Close", shortcut: "Escape", icon: CloseIcon },
);

export function App() {
  const refApp = useRef<HTMLDivElement>(null);
  const activeSpace = useAppStore((state) => state.activeSpace);
  const settingsOpen = useAppStore((state) => state.settings.open);
  const openSettings = useAppStore((state) => state.openSettings);
  const closeSettings = useAppStore((state) => state.closeSettings);
  const toggleSidebarVisibility = useAppStore((state) => state.toggleSidebarVisibility);

  const handleCommand = useCallback((event: CommandEvent) => {
    switch (event.detail.name) {
      case "settings.open":
        openSettings();
        break;
      case "settings.close":
        closeSettings();
        break;
      case "sidebar.primary.toggle":
        toggleSidebarVisibility();
        break;
    }
  }, []);

  useCommand({ ref: refApp, onCommand: handleCommand });

  return (
    <div ref={refApp} data-component="app" className="w-full h-full">
      <ApplySystemPreferences />
      {settingsOpen && <SettingsSpace />}
      {activeSpace === "logon" && <LogonSpace />}
      {activeSpace === "user" && <UserSpace className={settingsOpen && "hidden"} />}
    </div>
  );
}
