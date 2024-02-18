import "@/components/editors/index.tsx";

import { useEffect, useRef, useState } from "react";
import { User } from "@/models/users";
import { Agent } from "@/resources/agent.ts";
import { registerAction, unregisterAction } from "@/utils/commands";
import { AgentConnectionParameters, env } from "@/utils/env";
import Users from "@/resources/users";

import UserSpace from "@/components/spaces/UserSpace";
import WorkspaceSpace from "@/components/spaces/WorkspaceSpace";
import SettingsSpace from "@/components/spaces/settings/SettingsSpace";
import ApplySystemPreferences from "@/components/ApplySystemPreferences";
import ConnectionSpace from "@/components/spaces/ConnectionSpace";
import { AuthRequest } from "@/models/auth";
import { useAppStore } from "@/stores/AppStore";
import { calculateColorScheme } from "@/utils/colors";
import { useUserStore } from "@/stores/UserStore";

export function App() {
  const activeSpace = useAppStore((state) => state.activeSpace);
  const setActiveSpace = useAppStore((state) => state.setActiveSpace);
  const setColorScheme = useAppStore((state) => state.setColorScheme);
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
    env.getAgentConnectionParameters().then((params: AgentConnectionParameters) => {
      console.log(`Connecting agent: ${params.url}`);
      Agent.connect(params.url, params.apiKey)
        .then(() => {
          const authRequest = new AuthRequest({
            method: "user_password",
            credentials: { username: "local", password: "" },
          });
          return Users.logon(authRequest);
        })
        .then((user: User) => {
          console.log(`user '${user.username}' logged in`);
          reset();
          setActiveSpace("user");
          setColorScheme(calculateColorScheme(user.settings.colorScheme));
        })
        .catch((err) => {
          console.error(err);
        });
    });
  }, []);

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
      {activeSpace === "connection" && <ConnectionSpace />}
      {activeSpace === "user" && <UserSpace className={settingsOpen && "hidden"} />}
      {activeSpace === "workspace" && <WorkspaceSpace className={settingsOpen && "hidden"} />}
    </>
  );
}
