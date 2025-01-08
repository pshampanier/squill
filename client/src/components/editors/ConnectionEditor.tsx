import React, { Dispatch, useCallback, useEffect, useRef, useState } from "react";
import { EDITOR_CONNECTION } from "@/utils/constants";
import { useAppStore } from "@/stores/AppStore";
import { editors } from "@/resources/editors";
import { Connections } from "@/resources/connections";
import ConnectionIcon from "@/icons/plug.svg?react";
import { Connection } from "@/models/connections";
import { PushMessage } from "@/models/push-notifications";
import { agent } from "@/resources/agent";
import { useUserStore } from "@/stores/UserStore";
import { QueryHistoryAction } from "@/components/query/QueryHistory";
import { useTaskEffect } from "@/hooks/use-task-effect";
import Breadcrumb from "@/components/core/Breadcrumb";
import CatalogItemTitle from "@/components/user-store/CatalogItemTitle";
import ButtonGroup from "@/components/core/ButtonGroup";
import Overlay from "@/components/Overlay";
import Spinner from "@/components/core/Spinner";
import Toolbar from "@/components/core/Toolbar";
import Dropdown from "@/components/core/Dropdown";
import QueryTerminal from "@/components/query/QueryTerminal";
import TerminalIcon from "@/icons/terminal.svg?react";
import NotesIcon from "@/icons/notes.svg?react";
import { Driver, hasCapability } from "@/models/drivers";

const TERMINAL_VIEW = "terminal";
const WORKSHEETS_VIEW = "worksheets";
const DASHBOARDS_VIEW = "dashboards";
type View = typeof TERMINAL_VIEW | typeof WORKSHEETS_VIEW | typeof DASHBOARDS_VIEW;

const TERMINAL_ORIGIN = "terminal";

/**
 * The page displayed when the user is using a Connection from the sidebar.
 */
const ConnectionEditor: React.FunctionComponent<{ pageId: string }> = ({ pageId }) => {
  const [view, setView] = useState<View>(TERMINAL_VIEW);
  const [conn, setConn] = useState<Connection>(null);
  const [datasource, setDatasource] = useState<string>(null);
  const colorScheme = useAppStore((state) => state.colorScheme);
  const page = useAppStore((state) => state.pages.find((page) => page.id === pageId));
  const connId = page?.itemId; // UUID of the connection.
  const catalogItem = useUserStore((state) => state.catalog.get(connId));
  const loadCatalogResource = useUserStore((state) => state.loadCatalogResource);
  const addNotification = useUserStore((state) => state.addNotification);
  const { taskStatus, setTaskStatus, message, setMessage, setTask } = useTaskEffect();
  const driver: Driver = agent().drivers.find((driver) => driver.name === conn?.driver);

  // Children components can subscribe to the history of query executions.
  const queryEventHandler = useRef<Dispatch<QueryHistoryAction>>(null);

  useEffect(() => {
    if (catalogItem.resource) {
      setConn(catalogItem.resource as Connection);
    } else if (catalogItem.status !== "fetching") {
      setMessage("Loading connection...");
      setTask(async () => loadCatalogResource(connId));
      setTaskStatus("running");
    }
  }, [catalogItem]);

  // When the connection is loaded, we can set the datasource.
  useEffect(() => {
    if (conn && datasource === null) {
      // We only set the datasource if it is not already set.
      setDatasource(conn.defaultDatasource);
    }
  }, [conn, datasource]);

  // This function is called when the history component mounts.
  // We use it to store the dispatcher so we can initialize the history from the database and later on update the
  // history when new query are added, modified or removed.
  const handleHistoryDidMount = (origin: string, dispatcher: Dispatch<QueryHistoryAction>) => {
    queryEventHandler.current = dispatcher;
    setDatasource((datasource) => {
      Connections.listHistory(connId, origin, datasource).then((page) => {
        // The dispatcher is called with an action to initialize the history.
        queryEventHandler.current?.({
          type: "set",
          queries: page.queries,
        });
      });
      return datasource;
    });
  };

  const handleValidate = useCallback((origin: string, value: string) => {
    setDatasource((datasource) => {
      Connections.run(connId, datasource, origin, value)
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
      return datasource;
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

  const handleViewChange = useCallback((view: string) => {
    setView(view as View);
  }, []);

  const handleDatasourceChange = useCallback((datasource: string) => {
    setDatasource(datasource);
  }, []);

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
          <span>
            {view === DASHBOARDS_VIEW && "Dashboards"}
            {view === WORKSHEETS_VIEW && "Worksheets"}
            {view === TERMINAL_VIEW && "Terminal"}
          </span>
        </Breadcrumb>
        <Toolbar className="ml-auto">
          {!hasCapability(driver, "single_datasource") && (
            <Dropdown defaultValue={datasource} onChange={handleDatasourceChange} size="sm" variant="ghost">
              {conn?.datasources
                .filter((ds) => !ds.hidden)
                .map((ds) => <Dropdown.Option key={ds.name} value={ds.name} />)}
            </Dropdown>
          )}
          <ButtonGroup defaultValue={view} size="md" onChange={handleViewChange}>
            <ButtonGroup.Item name="terminal" icon={TerminalIcon} />
            <ButtonGroup.Item name="worksheets" icon={NotesIcon} />
          </ButtonGroup>
        </Toolbar>
      </div>
      {datasource && (
        <div className="flex flex-grow overflow-hidden">
          <QueryTerminal
            key={`terminal:${datasource}`}
            colorScheme={colorScheme}
            onHistoryMount={(dispatcher) => handleHistoryDidMount(TERMINAL_ORIGIN, dispatcher)}
            onValidate={(value: string) => handleValidate(TERMINAL_ORIGIN, value)}
          />
        </div>
      )}
      {taskStatus === "running" && (
        <Overlay delay={500} position="absolute">
          <Spinner size="lg" />
          <p className="text-xs font-semibold">{message?.toString()}</p>
        </Overlay>
      )}
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
