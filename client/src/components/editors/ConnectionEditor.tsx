import React, { useRef } from "react";
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
import QueryHistoryTimeline, { ExecutionEventHandler } from "@/components/query/QueryHistoryTimeline";
import { AuthenticationError } from "@/utils/errors";

/**
 * The page displayed when the user is using a Connection from the sidebar.
 */
const ConnectionEditor: React.FunctionComponent<{ pageId: string }> = ({ pageId }) => {
  const colorScheme = useAppStore((state) => state.colorScheme);
  const page = useAppStore((state) => state.pages.find((page) => page.id === pageId));
  const connectionId = page?.itemId; // UUID of the connection.

  // Children components can subscribe to the history of query executions.
  const executionEventHandler = useRef<ExecutionEventHandler>(null);
  const registerSubscriber = (handler: ExecutionEventHandler) => {
    if (handler && executionEventHandler.current === null) {
      // The first subscriber will receive the history immediately
      executionEventHandler.current = handler;
    } else {
      executionEventHandler.current = handler;
    }
  };

  const {
    status,
    refetch,
    error,
    data: _connection,
  } = useQuery<Connection, Error>({
    queryKey: ["connection-editor"],
    queryFn: async () => {
      return Connections.get(connectionId);
    },
    retry: (failureCount: number, error: Error) => {
      return !(error instanceof AuthenticationError) && failureCount < 2;
    },
    retryDelay: 2000,
    refetchOnWindowFocus: false,
  });

  const handleValidate = (value: string) => {
    Connections.execute(connectionId, value).then((executions) => {
      executionEventHandler.current(executions);
    });
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
          history={<QueryHistoryTimeline registerSubscriber={registerSubscriber} />}
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
