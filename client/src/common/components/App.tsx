import "@/components/editors/index.tsx";

import { useEffect, useState } from "react";
import { User } from "@/resources/user/user";
import { Agent } from "@/resources/agent.ts";
import { useUserStore } from "@/stores/UserStore";

import UserSpace from "@/components/spaces/UserSpace";
import WorkspaceSpace from "@/components/spaces/WorkspaceSpace";

export function App() {
  const agentUrl = useState(window.location.href.split("#" /* remove everything after # */)[0])[0];
  const activeSpace = useUserStore((state) => state.activeSpace);
  const reset = useUserStore().reset;

  useEffect(() => {
    console.log("App useEffect");
    Agent.connect(agentUrl)
      .then(() => {
        return User.logon({ method: "user_password", credentials: { username: "local", password: "" } });
      })
      .then((user: User) => {
        console.log(`${user.username} logged in`);
        reset();
      });
  }, [agentUrl, reset]);

  return (
    <>
      {activeSpace === "user" && <UserSpace />}
      {activeSpace === "workspace" && <WorkspaceSpace />}
    </>
  );
}
