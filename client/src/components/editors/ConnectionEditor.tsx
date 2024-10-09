import React, { Dispatch, useCallback, useEffect, useRef } from "react";
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
import QueryHistoryTimeline, { QueryHistoryAction } from "@/components/query/QueryHistoryTimeline";
import { AuthenticationError } from "@/utils/errors";
import { PushMessage } from "@/models/push-notifications";
import { agent } from "@/resources/agent";
import { useUserStore } from "@/stores/UserStore";

/**
 * The page displayed when the user is using a Connection from the sidebar.
 */
const ConnectionEditor: React.FunctionComponent<{ pageId: string }> = ({ pageId }) => {
  const colorScheme = useAppStore((state) => state.colorScheme);
  const page = useAppStore((state) => state.pages.find((page) => page.id === pageId));
  const connectionId = page?.itemId; // UUID of the connection.
  const catalogItem = useUserStore((state) => state.catalog.get(connectionId));

  // Children components can subscribe to the history of query executions.
  const queryEventHandler = useRef<Dispatch<QueryHistoryAction>>(null);
  const registerQueryEventHandler = (dispatcher: Dispatch<QueryHistoryAction>) => {
    queryEventHandler.current = dispatcher;
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
      console.error("Loading connection failed.", {
        id: connectionId,
        error: error.message,
        failureCount: failureCount,
        stack: error.stack,
      });
      return !(error instanceof AuthenticationError) && failureCount < 2;
    },
    retryDelay: 2000,
    refetchOnWindowFocus: false,
  });

  const handleValidate = (value: string) => {
    Connections.execute(connectionId, value).then((queries) => {
      queryEventHandler.current?.call(null, {
        type: "update",
        queries,
      });
    });
  };

  const handleQueryUpdate = useCallback((message: PushMessage) => {
    queryEventHandler.current?.call(null, {
      type: "update",
      queries: [message.query],
    });
  }, []);

  useEffect(() => {
    agent().subscribeToPushNotifications("query", handleQueryUpdate);
    return () => {
      agent().unsubscribeFromPushNotifications("query", handleQueryUpdate);
    };
  }, []);

  return (
    <div className="w-full h-full px-2">
      {status !== "success" && (
        <LoadingContainer
          message={`Opening '${catalogItem.title}'...`}
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
          history={<QueryHistoryTimeline registerDispatcher={registerQueryEventHandler} />}
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
