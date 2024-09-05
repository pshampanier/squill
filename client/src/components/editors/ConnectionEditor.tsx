import React from "react";
import { EDITOR_CONNECTION } from "@/utils/constants";
import { useAppStore } from "@/stores/AppStore";
import { editors } from "@/resources/editors";
import { useQuery } from "@tanstack/react-query";
import { Connection } from "@/models/connections";
import Connections from "@/resources/connections";
import ConnectionIcon from "@/icons/plug.svg?react";
import QueryTerminal from "@/components/query/QueryTerminal";
import QueryPrompt from "@/components/query/QueryPrompt";
import LoadingContainer from "@/components/core/LoadingContainer";
import { AuthenticationError } from "@/utils/errors";
import { useUserStore } from "@/stores/UserStore";

/**
 * The page displayed when the user is using a Connection from the sidebar.
 */
const ConnectionEditor: React.FunctionComponent<{ pageId: string }> = ({ pageId }) => {
  const colorScheme = useAppStore((state) => state.colorScheme);
  const page = useAppStore((state) => state.pages.find((page) => page.id === pageId));
  const connId = page?.itemId; // UUID of the connection.
  const executeBuffer = useUserStore((state) => state.executeBuffer);

  const {
    status,
    refetch,
    error,
    data: _connection,
  } = useQuery<Connection, Error>({
    queryKey: ["connection-editor"],
    queryFn: async () => {
      return Connections.get(connId);
    },
    retry: (failureCount: number, error: Error) => {
      return !(error instanceof AuthenticationError) && failureCount < 2;
    },
    retryDelay: 2000,
    refetchOnWindowFocus: false,
  });

  const handleValidate = (value: string) => {
    executeBuffer(connId, value);
  };

  return (
    <div className="w-full h-full px-2">
      {status !== "success" && (
        <LoadingContainer
          message={`Opening '${page.title}'...`}
          status={status}
          error={error}
          errorFallback="Oops, cannot open the connection..."
          onRetry={() => refetch()}
        />
      )}
      {status === "success" && (
        <QueryTerminal
          prompt={<ConnectionPrompt />}
          colorScheme={colorScheme}
          history={undefined}
          onValidate={handleValidate}
        />
      )}
    </div>
  );
};

function ConnectionPrompt() {
  return (
    <QueryPrompt>
      <span className="flex space-x-2 items-center">
        <span>postgres@adworks</span>
      </span>
      <QueryPrompt.DateTimeSegment date={new Date()} />
    </QueryPrompt>
  );
}

editors.register({
  name: EDITOR_CONNECTION,
  selector: null,
  icon: ConnectionIcon,
  component: ConnectionEditor,
});

export default ConnectionEditor;
