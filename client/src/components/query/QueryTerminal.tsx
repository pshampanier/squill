import cx from "classix";
import { Dispatch, useCallback } from "react";
import React from "react";
import { CommandEvent, registerCommand } from "@/utils/commands";
import { QueryExecution, QueryExecutionKey } from "@/models/queries";
import { useUserStore } from "@/stores/UserStore";
import { Connections } from "@/resources/connections";
import { useCommand } from "@/hooks/use-commands";
import CommandLinkList from "@/components/core/CommandLinkList";
import QueryInput, { QueryEditorInstance } from "@/components/query/QueryInput";
import Kbd from "@/components/core/Kbd";
import AutoHide from "@/components/core/AutoHide";
import QueryHistory, { QueryHistoryAction } from "@/components/query/QueryHistory";
import QueryResultViewer from "@/components/query/QueryResultViewer";

registerCommand(
  {
    name: "terminal.clear",
    description: "Clear Terminal",
    shortcut: "Ctrl+L",
  },
  {
    name: "terminal.history.clear",
    description: "Clear History",
    shortcut: [
      ["Meta+K", "Ctrl+K"], // Desktop
      ["Alt+Meta+K", "Alt+Ctrl+K"], // Web
    ],
  },
  {
    name: "terminal.history.search",
    description: "Search History",
    shortcut: "Ctrl+R",
  },
  {
    name: "terminal.execute",
    description: "Execute",
    shortcut: "F5",
  },
);

type QueryTerminalProps = {
  /**
   * The color scheme of the query prompt.
   */
  colorScheme: "light" | "dark";

  /**
   * A callback function that is called when the user validates the value in the editor.
   */
  onValidate?: (value: string) => void;

  onHistoryMount?: (dispatcher: Dispatch<QueryHistoryAction>) => void;

  className?: string;
};

const PLACEHOLDER = (
  <span className="flex h-6 -mt-1">
    <span className="flex whitespace-nowrap items-center text-xs">
      <span>Press</span>
      <Kbd className="mt-0.5" size="xs" shortcut={"F5"} />
      <span>to execute or </span>
      <Kbd className="mt-0.5" size="xs" shortcut={"Enter"} />
      <span>after a semicolon</span>
    </span>
  </span>
);

export default function QueryTerminal({ colorScheme, onHistoryMount, onValidate, className }: QueryTerminalProps) {
  const editorRef = React.useRef<QueryEditorInstance | null>(null);
  const refRoot = React.useRef<HTMLDivElement>(null);
  const refHistory = React.useRef<HTMLDivElement>(null);
  const refHistoryDispatcher = React.useRef<Dispatch<QueryHistoryAction> | null>(null);
  const addNotification = useUserStore((state) => state.addNotification);
  const terminalSettings = useUserStore((state) => state.settings?.terminalSettings);
  const [openedQuery, setOpenedQuery] = React.useState<QueryExecutionKey | null>(null);

  //
  // Update the height of the history component
  //
  const updateLayout = useCallback((size?: { width: number; height: number }) => {
    const queryEditorSize = size ?? editorRef.current?.getSize();
    if (queryEditorSize && refHistory.current) {
      refHistory.current.style.maxHeight = `calc(100% - ${queryEditorSize.height}px)`;
    }
  }, []);

  //
  // Command handling
  //
  const handleOnCommand = useCallback(
    (event: CommandEvent, query?: QueryExecution) => {
      switch (event.detail.name) {
        case "terminal.clear":
          // TODO: Implement clear
          break;
        case "terminal.history.clear":
          refHistoryDispatcher.current?.({ type: "set" });
          break;
        case "terminal.history.search":
          // TODO: Implement search
          break;
        case "terminal.execute":
          editorRef.current?.validate();
          break;
        case "query.rerun": {
          //
          // Rerun the given query.
          //
          onValidate(query.text);
          break;
        }
        case "clipboard.paste": {
          //
          // Paste the clipboard content into the query editor.
          //
          editorRef.current?.focus();
          break;
        }

        case "query.history.delete": {
          //
          // Delete the given query from the history.
          //
          // We are doing an optimistic  delete here, if it fails, a notification will be displayed by the user interface.
          Connections.removeFromHistory(query.connectionId, query.id).catch((err) => {
            addNotification({
              id: crypto.randomUUID(),
              variant: "error",
              message: "Failed to delete the query from history.",
              description: err,
            });
          });
          // TODO: The query status should be temporarily set to "deleted" to prevent instead of removing it from the
          // history immediately, and only remove it when the API call is successful.
          refHistoryDispatcher.current?.({ type: "remove", queries: [query] });
          if (openedQuery.connectionId === query.connectionId && openedQuery.id === query.id) {
            // If the query is open, close it.
            setOpenedQuery(null);
          }
          break;
        }

        case "query.copy": {
          //
          // Copy the given query to the clipboard
          //
          if (query?.text) {
            navigator.clipboard
              .writeText(query.text)
              .then(() => {
                addNotification({
                  id: crypto.randomUUID(),
                  variant: "success",
                  message: "Query copied to the clipboard.",
                  autoDismiss: true,
                });
              })
              .catch((err) => {
                addNotification({
                  id: crypto.randomUUID(),
                  variant: "error",
                  message: "Copy failed.",
                  description: err,
                  autoDismiss: true,
                });
              });
          }
          break;
        }

        case "query.open": {
          //
          // Open a query result in the editor.
          //
          setOpenedQuery({
            connectionId: query.connectionId,
            id: query.id,
          });
          break;
        }

        case "close": {
          //
          // Close the query result and display back the terminal.
          //
          setOpenedQuery(null);
          break;
        }

        default:
          return;
      }
      event.stopPropagation(); // The command event has been handled
    },
    [onValidate],
  );
  useCommand({ ref: refRoot, onCommand: handleOnCommand });

  // The query editor is mounted
  const handleEditorDidMount = useCallback((editor: QueryEditorInstance) => {
    editor.focus();
    editorRef.current = editor;
    updateLayout();
  }, []);

  // The History component is mounted
  const handleHistoryDidMount = useCallback((dispatcher: Dispatch<QueryHistoryAction>) => {
    updateLayout();
    refHistoryDispatcher.current = dispatcher;
    onHistoryMount?.(dispatcher);
  }, []);

  const handleEditorResize = useCallback((size: { width: number; height: number }) => {
    updateLayout(size);
  }, []);

  const classes = {
    root: cx("w-full h-full", className),
    terminal: cx("flex flex-col w-full h-full overflow-hidden", openedQuery ? "hidden" : ""),
    history: "flex-col flex-shrink-0 overflow-y-hidden px-4 pb-2",
    input: "flex-shrink-0 py-1 min-h-6",
    help: "flex flex-shrink flex-grow min-h-0 overflow-hidden items-center justify-center opacity-70 select-none",
  };

  return (
    <div ref={refRoot} className={classes.root} data-component="query-terminal">
      <div className={classes.terminal}>
        <div ref={refHistory} className={classes.history}>
          <QueryHistory onMount={handleHistoryDidMount} onCommand={handleOnCommand} />
        </div>
        <QueryInput
          mode="terminal"
          className={classes.input}
          onValidate={onValidate}
          onMount={handleEditorDidMount}
          onResize={handleEditorResize}
          colorScheme={colorScheme}
          placeholder={PLACEHOLDER}
          settings={terminalSettings?.editorSettings}
        />
        <AutoHide className={classes.help} onClick={() => editorRef.current?.focus()}>
          <CommandLinkList className="p-6">
            <CommandLinkList.Link command="terminal.clear" />
            <CommandLinkList.Link command="terminal.history.clear" />
            <CommandLinkList.Link command="terminal.history.search" />
          </CommandLinkList>
        </AutoHide>
      </div>
      {openedQuery && <QueryResultViewer queryKey={openedQuery} onCommand={handleOnCommand} />}
    </div>
  );
}
