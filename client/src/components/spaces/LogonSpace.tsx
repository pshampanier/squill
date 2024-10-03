import { User } from "@/models/users";
import { Agent } from "@/resources/agent.ts";
import { Users } from "@/resources/users";
import { env } from "@/utils/env";
import { Authentication } from "@/models/auth";
import { useAppStore } from "@/stores/AppStore";
import Space, { SpaceProps } from "@/components/spaces/Space";
import Titlebar from "@/components/titlebar/Titlebar";
import { useUserStore } from "@/stores/UserStore";
import { useQuery } from "@tanstack/react-query";
import LoadingContainer from "@/components/core/LoadingContainer";

/**
 * This is the space that is displayed while the application is connecting to the agent.
 */
export default function LogonSpace(props: SpaceProps) {
  const setActiveSpace = useAppStore((state) => state.setActiveSpace);
  const reset = useUserStore((state) => state.reset);
  const loadCatalog = useUserStore((state) => state.loadCatalog);

  const { status, refetch, error } = useQuery<boolean, Error>({
    queryKey: ["agent-connect"],
    queryFn: async () => {
      try {
        // Get the agent connection parameters which are stored in the environment
        const endpoint = env.getAgentEndpoint();

        // Connect to the agent
        console.log(`Connecting agent: ${endpoint.url}`);
        await Agent.connect(endpoint.url, endpoint.apiKey);

        // Once the agent is connected, log in the user.
        // As for now, only the 'local' user is supported.
        console.log("Logging in user 'local'");
        const authRequest = new Authentication({
          method: "user_password",
          credentials: { username: "local", password: "" },
        });
        const user: User = await Users.logon(authRequest);
        console.log(`user '${user.username}' logged in`);

        // Connected with the agent and logged in the user, reset the user store and set the active space to 'user'
        reset();

        // load the user's catalog (the root of the catalog only)
        await loadCatalog();

        setActiveSpace("user");
        return true; // Not used but required by useQuery...
      } catch (error) {
        console.error("Failed to connect to the agent", error);
        throw error;
      }
    },
    retry: 5,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
  });

  return (
    <Space {...props} className="items-center justify-center">
      {env.applicationType === "desktop" && (
        <Titlebar>
          <Titlebar.AppName />
        </Titlebar>
      )}
      <div className="flex flex-row h-[calc(100%-2.75rem)] w-full items-center">
        <LoadingContainer
          message="Trying to connect..."
          status={status}
          error={error}
          errorFallback="Oops, the connection to the Agent failed..."
          onRetry={() => refetch()}
        />
      </div>
    </Space>
  );
}
