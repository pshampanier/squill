import cx from "classix";
import { Dispatch, useCallback } from "react";
import React from "react";
import { CommandEvent, registerCommand } from "@/utils/commands";
import { useCommand } from "@/hooks/use-commands";
import CommandLinkList from "@/components/core/CommandLinkList";
import QueryInput, { QueryEditorInstance } from "@/components/query/QueryInput";
import Kbd from "@/components/core/Kbd";
import AutoHide from "@/components/core/AutoHide";
import QueryHistory, { QueryHistoryAction } from "@/components/query/QueryHistory";

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
  const refHistoryDispatcher = React.useRef<Dispatch<QueryHistoryAction> | null>(null);

  //
  // Command handling
  //
  const handleOnCommand = useCallback((event: CommandEvent) => {
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
    }
  }, []);
  useCommand({ ref: refRoot, onCommand: handleOnCommand });

  // The query editor is mounted
  const handleEditorDidMount = useCallback((editor: QueryEditorInstance) => {
    editor.focus();
    editorRef.current = editor;
  }, []);

  // The History component is mounted
  const handleHistoryDidMount = useCallback((dispatcher: Dispatch<QueryHistoryAction>) => {
    refHistoryDispatcher.current = dispatcher;
    onHistoryMount?.(dispatcher);
  }, []);

  const classes = {
    root: cx("relative w-full h-full overflow-hidden", className),
    scroll: "flex flex-col absolute inset-0 overflow-y-auto",
    history: "flex-shrink-0 px-5",
    input: "flex-shrink-0 py-1 min-h-6",
    help: "flex flex-shrink flex-grow min-h-0 overflow-hidden items-center justify-center opacity-70",
  };

  return (
    <div ref={refRoot} className={classes.root}>
      <div className={classes.scroll}>
        <QueryHistory onMount={handleHistoryDidMount} className={classes.history} />
        <QueryInput
          mode="terminal"
          className={classes.input}
          onValidate={onValidate}
          onMount={handleEditorDidMount}
          colorScheme={colorScheme}
          placeholder={PLACEHOLDER}
        />
        <AutoHide className={classes.help} onClick={() => editorRef.current?.focus()}>
          <CommandLinkList className="p-6">
            <CommandLinkList.Link command="terminal.clear" />
            <CommandLinkList.Link command="terminal.history.clear" />
            <CommandLinkList.Link command="terminal.history.search" />
          </CommandLinkList>
        </AutoHide>
      </div>
    </div>
  );
}
