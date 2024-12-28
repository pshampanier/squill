import cx from "classix";
import { useTaskEffect } from "@/hooks/use-task-effect";
import { QueryExecution, QueryExecutionKey } from "@/models/queries";
import { Connections } from "@/resources/connections";
import { CommandEvent } from "@/utils/commands";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryCache } from "@/hooks/use-query-cache";
import { useUserStore } from "@/stores/UserStore";
import LoadingContainer from "@/components/core/LoadingContainer";
import QueryExecutionHeader from "@/components/query/QueryExecutionHeader";
import QueryTableView from "@/components/query/QueryTableView";
import { agent } from "@/resources/agent";
import { PushMessage } from "@/models/push-notifications";

type QueryResultViewerProps = {
  queryKey: QueryExecutionKey;
  onCommand: (event: CommandEvent, query: QueryExecution) => void;
  className?: string;
};

export default function QueryResultViewer({ queryKey, onCommand, className }: QueryResultViewerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState<QueryExecution | null>(null);
  const tableSettings = useUserStore((state) => state.settings?.tableSettings);

  const { taskStatus, message, setTask } = useTaskEffect(
    "running",
    async () => {
      const query = await Connections.getFromHistory(queryKey.connectionId, queryKey.id);
      setQuery(query);
    },
    "Loading the query...",
  );

  // The cache is used to load the query results
  const { getQueryStates } = useQueryCache({ fetchLimit: 250 /** TODO: fix */ });

  const handleOnRetryLoadQuery = useCallback(() => {
    setTask(async () => {
      const query = await Connections.getFromHistory(queryKey.connectionId, queryKey.id);
      setQuery(query);
    }, "Loading the query...");
  }, [queryKey]);

  //
  // Handle the query updates
  // When the query is running or pending, we subscribe to push notifications to get updates on the query allowing the
  // rendering to be updated in real-time.
  //

  // 1. Update the query state when a push notification is received
  const handleQueryUpdate = useCallback((message: PushMessage) => {
    setQuery((prev) => {
      if (prev === null || prev.revision < message.query.revision) {
        return message.query;
      } else {
        return prev;
      }
    });
  }, []);

  // 2. Subscribe to push notifications when the query is running or pending
  useEffect(() => {
    if (query?.status === "running" || query?.status === "pending") {
      agent().subscribeToPushNotifications(
        handleQueryUpdate,
        (message: PushMessage) =>
          message.type === "query" &&
          message.query.connectionId === queryKey.connectionId &&
          message.query.id === queryKey.id,
      );
      return () => {
        agent().unsubscribeFromPushNotifications("query", handleQueryUpdate);
      };
    }
  }, [queryKey, query?.status]);

  // Set the focus to the root element when the component is mounted
  // This is used to make sure the "close" command is triggered when the user presses the "Escape" key.
  useEffect(() => {
    rootRef.current?.focus(); // Set focus to the root element
  }, []);

  // Get the loading states of the query result set
  const { dataframe, fetching } = getQueryStates(query);

  const classes = {
    container: cx("h-full flex flex-col px-4 focus:outline-none", className),
  };

  return (
    <div ref={rootRef} className={classes.container} tabIndex={0}>
      <LoadingContainer
        message={message.toString()}
        status={taskStatus}
        errorFallback="Failed to load the query"
        onRetry={handleOnRetryLoadQuery}
      />
      {query && (
        <div className="w-full h-full flex flex-col overflow-hidden">
          <QueryExecutionHeader query={query} locale="en-US" mode="full" onCommand={(e) => onCommand(e, query)} />
          <div className="mt-2 mb-2 flex-grow overflow-hidden">
            <QueryTableView query={query} rows={dataframe} fetching={fetching} settings={tableSettings} />
          </div>
        </div>
      )}
    </div>
  );
}
