import React, { Dispatch, useCallback, useEffect, useRef } from "react";
import { EDITOR_CONNECTION } from "@/utils/constants";
import { useAppStore } from "@/stores/AppStore";
import { editors } from "@/resources/editors";
import { Connections } from "@/resources/connections";
import ConnectionIcon from "@/icons/plug.svg?react";
import QueryTerminal from "@/components/query/QueryTerminal";
import { PushMessage } from "@/models/push-notifications";
import { agent } from "@/resources/agent";
import { useUserStore } from "@/stores/UserStore";
import { QueryHistoryAction } from "@/components/query/QueryHistory";
import Breadcrumb from "@/components/core/Breadcrumb";
import CatalogItemTitle from "@/components/user-store/CatalogItemTitle";
import ButtonGroup from "@/components/core/ButtonGroup";

const TERMINAL_ORIGIN = "terminal";

/**
 * The page displayed when the user is using a Connection from the sidebar.
 */
const ConnectionEditor: React.FunctionComponent<{ pageId: string }> = ({ pageId }) => {
  const colorScheme = useAppStore((state) => state.colorScheme);
  const page = useAppStore((state) => state.pages.find((page) => page.id === pageId));
  const connId = page?.itemId; // UUID of the connection.
  const catalogItem = useUserStore((state) => state.catalog.get(connId));
  const addNotification = useUserStore((state) => state.addNotification);

  // Children components can subscribe to the history of query executions.
  const queryEventHandler = useRef<Dispatch<QueryHistoryAction>>(null);

  // This function is called when the history component mounts.
  // We use it to store the dispatcher so we can initialize the history from the database and later on update the
  // history when new query are added, modified or removed.
  const handleHistoryDidMount = (origin: string, dispatcher: Dispatch<QueryHistoryAction>) => {
    queryEventHandler.current = dispatcher;
    Connections.list_history(connId, origin).then((page) => {
      // The dispatcher is called with an action to initialize the history.
      queryEventHandler.current?.({
        type: "set",
        queries: page.queries,
      });
    });
  };

  const handleValidate = useCallback((origin: string, value: string) => {
    Connections.execute(connId, origin, value)
      .then((queries) => {
        queryEventHandler.current?.call(null, {
          type: "update",
          queries,
        });
      })
      .catch((error) => {
        addNotification({
          id: crypto.randomUUID(),
          variant: "error",
          message: "The query execution failed.",
          autoDismiss: true,
          description: error,
        });
      });
  }, []);

  const handleQueryUpdate = useCallback((message: PushMessage) => {
    queryEventHandler.current?.call(null, {
      type: "update",
      queries: [message.query],
    });
  }, []);

  useEffect(() => {
    agent().subscribeToPushNotifications(
      handleQueryUpdate,
      (message: PushMessage) => message.type === "query" && message.query?.connectionId === connId,
    );
    return () => {
      agent().unsubscribeFromPushNotifications("query", handleQueryUpdate);
    };
  }, [connId]);

  return (
    <div className="flex flex-col h-full" data-component="connection-editor">
      <div className="flex flex-shrink-0 text-xs p-5 select-none">
        <Breadcrumb className="flex-none">
          <span>
            <CatalogItemTitle id={catalogItem.parentId} />
          </span>
          <span>
            <CatalogItemTitle id={catalogItem.id} />
          </span>
        </Breadcrumb>
        <div className="flex flex-grow">
          <div className="ml-auto flex-none">
            <ButtonGroup defaultValue="terminal" size="sm">
              <ButtonGroup.Item name="terminal" label="Terminal" />
              <ButtonGroup.Item name="worksheets" label="Worksheets" disabled />
            </ButtonGroup>
          </div>
        </div>
      </div>
      <div className="flex flex-grow overflow-hidden">
        <QueryTerminal
          colorScheme={colorScheme}
          onHistoryMount={(dispatcher) => handleHistoryDidMount(TERMINAL_ORIGIN, dispatcher)}
          onValidate={(value: string) => handleValidate(TERMINAL_ORIGIN, value)}
        />
      </div>
    </div>
  );
};

editors.register({
  name: EDITOR_CONNECTION,
  selector: null,
  icon: ConnectionIcon,
  component: ConnectionEditor,
});

export default ConnectionEditor;
