import "@/components/editors/index.tsx";

import { useEffect, useRef, useState } from "react";
import { User } from "@/resources/user/user";
import { Agent } from "@/resources/agent.ts";
import { useUserStore } from "@/stores/UserStore";
import { registerAction, unregisterAction } from "@/utils/commands";

import UserSpace from "@/components/spaces/UserSpace";
import WorkspaceSpace from "@/components/spaces/WorkspaceSpace";
import SettingsSpace from "@/components/spaces/settings/SettingsSpace";
import ApplySystemPreferences from "@/components/ApplySystemPreferences";

export function App() {
  const agentUrl = useState(window.location.href.split("/").slice(0, -1).join("/"))[0];
  const activeSpace = useUserStore((state) => state.activeSpace);
  const reset = useUserStore((state) => state.reset);
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
    console.log(`Connecting agent: ${agentUrl}`);
    Agent.connect(agentUrl)
      .then(() => {
        return User.logon({ method: "user_password", credentials: { username: "local", password: "" } });
      })
      .then((user: User) => {
        console.log(`${user.username} logged in`);
        reset();
      });
  }, [agentUrl, reset]);

  useEffect(() => {
    registerAction("settings.open", openSettings);
    return () => {
      unregisterAction("settings.open", openSettings);
    };
  });

  return (
    <>
      <ApplySystemPreferences />
      {settingsOpen && <SettingsSpace />}
      {activeSpace === "user" && <UserSpace className={settingsOpen && "hidden"} />}
      {activeSpace === "workspace" && <WorkspaceSpace className={settingsOpen && "hidden"} />}
    </>
  );
}
