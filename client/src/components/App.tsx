import "@/components/editors/index.tsx";
import { useEffect, useRef, useState } from "react";
import { registerAction, unregisterAction } from "@/utils/commands";
import UserSpace from "@/components/spaces/UserSpace";
import SettingsSpace from "@/components/spaces/settings/SettingsSpace";
import ApplySystemPreferences from "@/components/ApplySystemPreferences";
import ConnectionSpace from "@/components/spaces/ConnectionSpace";
import { useAppStore } from "@/stores/AppStore";
import CommandManager from "@/components/CommandManager";

export function App() {
  const activeSpace = useAppStore((state) => state.activeSpace);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  const closeSettings = useRef(() => {
    console.log("Closing settings");
    setSettingsOpen(false);
    unregisterAction("settings.close", closeSettings.current);
  });

  const openSettings = () => {
    console.log("Opening settings");
    setSettingsOpen(true);
    registerAction("settings.close", closeSettings.current);
  };

  useEffect(() => {
    registerAction("settings.open", openSettings);
    return () => {
      unregisterAction("settings.open", openSettings);
    };
  });

  return (
    <>
      <ApplySystemPreferences />
      <CommandManager />
      {settingsOpen && <SettingsSpace />}
      {activeSpace === "connection" && <ConnectionSpace />}
      {activeSpace === "user" && <UserSpace className={settingsOpen && "hidden"} />}
    </>
  );
}
