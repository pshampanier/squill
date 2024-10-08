import QueryInput from "@/components/query/QueryInput";
import { primary as colors } from "@/utils/colors";
import cx from "classix";
import Kbd from "@/components/core/Kbd";
import { registerCommand } from "@/utils/commands";
import CommandLinkList from "@/components/core/CommandLinkList";
import AutoHide from "@/components/core/AutoHide";

registerCommand(
  {
    name: "terminal.clear",
    description: "Clear Terminal",
    shortcut: "Ctrl+L",
  },
  {
    name: "terminal.history.clear",
    description: "Clear History",
    shortcut: ["Meta+K", "Ctrl+K"],
  },
  {
    name: "terminal.history.search",
    description: "Search History",
    shortcut: "Ctrl+R",
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

  /**
   * The query prompt.
   * This is the component that is displayed before the query input.
   */
  prompt: React.ReactNode;

  /**
   * The components that display the history of the terminal.
   */
  history: React.ReactNode;

  className?: string;
};

const PLACEHOLDER = (
  <>
    Press <Kbd shortcut={["Meta+[Enter]", "Ctrl+[Enter]"]} /> to execute or just <Kbd shortcut={"[Enter]"} /> after a
    semicolon
  </>
);

export default function QueryTerminal({ colorScheme, onValidate, prompt, className, history }: QueryTerminalProps) {
  const classes = {
    self: cx("flex flex-col w-full h-full divide-y space-y-2", colors("divide"), className),
  };

  return (
    <div className={classes.self}>
      <div className="flex flex-col flex-grow w-full overflow-auto">
        <AutoHide className="flex w-full grow items-center justify-center opacity-70">
          <CommandLinkList>
            <CommandLinkList.Link command="terminal.clear" />
            <CommandLinkList.Link command="terminal.history.clear" />
            <CommandLinkList.Link command="terminal.history.search" />
          </CommandLinkList>
        </AutoHide>
        {/**
         * The history of the terminal
         **/}
        {history}
      </div>
      {/**
       * The query input
       **/}
      <div className="flex flex-col py-2 min-h-fit">
        {prompt}
        <QueryInput
          mode="terminal"
          className="py-2 min-h-6"
          onValidate={onValidate}
          colorScheme={colorScheme}
          placeholder={PLACEHOLDER}
        />
      </div>
    </div>
  );
}
