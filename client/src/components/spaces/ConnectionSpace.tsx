import { User } from "@/models/users";
import { Agent } from "@/resources/agent.ts";
import Users from "@/resources/users";
import { env } from "@/utils/env";
import { AuthRequest } from "@/models/auth";
import { calculateColorScheme } from "@/utils/colors";
import { useAppStore } from "@/stores/AppStore";
import Space, { SpaceProps } from "@/components/spaces/Space";
import Spinner from "@/components/core/Spinner";
import Button from "@/components/core/Button";
import UserErrorMessage from "@/components/core/UserErrorMessage";
import Titlebar from "@/components/titlebar/Titlebar";
import { useUserStore } from "@/stores/UserStore";
import CrashedImage from "@/assets/images/crashed.svg?react";
import cx from "classix";
import { useQuery } from "@tanstack/react-query";

/**
 * This is the space that is displayed while the application is connecting to the agent.
 */
export default function ConnectionSpace(props: SpaceProps) {
  const setActiveSpace = useAppStore((state) => state.setActiveSpace);
  const setColorScheme = useAppStore((state) => state.setColorScheme);
  const reset = useUserStore((state) => state.reset);

  const { status, failureCount, refetch, error } = useQuery<void, Error>({
    queryKey: ["agent-connect"],
    queryFn: async () => {
      // Get the agent connection parameters which are stored in the environment
      const endpoint = env.getAgentEndpoint();

      // Connect to the agent
      console.log(`Connecting agent: ${endpoint.url}`);
      await Agent.connect(endpoint.url, endpoint.apiKey);

      // Once the agent is connected, log in the user.
      // As for now, only the 'local' user is supported.
      console.log("Logging in user 'local'");
      const authRequest = new AuthRequest({
        method: "user_password",
        credentials: { username: "local", password: "" },
      });
      const user: User = await Users.logon(authRequest);
      console.log(`user '${user.username}' logged in`);

      // Connected with the agent and logged in the user, reset the user store and set the active space to 'user'
      reset();
      setActiveSpace("user");
      setColorScheme(calculateColorScheme(user.settings.colorScheme));
    },
    retry: 5,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
  });

  const classes = {
    loading: cx("flex flex-col bg-transparent w-full items-center", status !== "pending" && "hidden"),
    error: cx(
      "absolute -top-24 flex flex-col bg-transparent w-full items-center",
      status === "error" ? "transition-opacity duration-1000 opacity-100" : "opacity-0",
    ),
  };

  return (
    <Space {...props} className="items-center justify-center">
      {env.applicationType === "desktop" && (
        <Titlebar>
          <Titlebar.AppName />
        </Titlebar>
      )}
      <div className="flex flex-row h-[calc(100%-2.75rem)] w-full items-center">
        <div className="relative bg-transparent w-full">
          {status === "pending" && (
            <div className={classes.loading}>
              <Spinner size="xl" delay={200} />
              <div className="flex text-xs h-8 w-full items-center justify-center">
                <span
                  className={cx("transition-opacity duration-500", failureCount <= 1 ? "opacity-0" : "opacity-100")}
                >
                  Trying to connect...
                </span>
              </div>
            </div>
          )}
          <div className={classes.error}>
            <CrashedImage className="w-40 h-40 opacity-20" />
            <div className="flex flex-col text-sm font-semibold w-full items-center space-y-3">
              <UserErrorMessage error={error} fallback="Oops, the connection to the Agent failed..." />
              <Button onClick={() => refetch()} variant="outline" text="Retry" className="flex px-8 justify-center" />
            </div>
          </div>
        </div>
      </div>
    </Space>
  );
}
