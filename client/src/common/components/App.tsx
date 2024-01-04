import "@/components/editors/index.tsx";

import { useEffect, useState } from "react";
import { User } from "@/resources/user/user";
import { Agent } from "@/resources/agent.ts";
import { useUserStore } from "@/stores/UserStore";
import { registerAction, unregisterAction } from "@/utils/commands";

import UserSpace from "@/components/spaces/UserSpace";
import WorkspaceSpace from "@/components/spaces/WorkspaceSpace";
import SettingsSpace from "@/components/spaces/settings/SettingsSpace";

export function App() {
  const agentUrl = useState(window.location.href.split("/").slice(0, -1).join("/"))[0];
  const activeSpace = useUserStore((state) => state.activeSpace);
  const setActiveSpace = useUserStore((state) => state.setActiveSpace);
  const reset = useUserStore((state) => state.reset);

  const openSettings = () => {
    console.log("Opening settings");
    setActiveSpace("settings");
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
    registerAction("settings", openSettings);
    return () => {
      unregisterAction("settings", openSettings);
    };
  });

  return (
    <>
      {activeSpace === "user" && <UserSpace />}
      {activeSpace === "workspace" && <WorkspaceSpace />}
      {activeSpace === "settings" && <SettingsSpace />}
    </>
  );
}
