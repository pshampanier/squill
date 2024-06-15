import QueryInput from "@/components/query/QueryInput";
import { primary as colors } from "@/utils/colors";
import cx from "classix";
import Kbd from "@/components/core/Kbd";

type QueryTerminalProps = {
  /**
   * The color scheme of the query prompt.
   */
  colorScheme: "light" | "dark";

  /**
   * A callback function that is called when the user validates a query.
   *
   * If the editor contains multiple queries (separated by a semicolon), this function is called for each query.
   */
  onValidate?: (query: string) => void;

  /**
   * The query prompt.
   *
   * This is the element that is displayed before the query input.
   */
  prompt: React.ReactNode;

  className?: string;
};

const PLACEHOLDER = (
  <>
    Press <Kbd shortcut={["Meta+[Enter]", "Ctrl+[Enter]"]} /> to execute or just <Kbd shortcut={"[Enter]"} /> after a
    semicolon
  </>
);

export default function QueryTerminal({ colorScheme, onValidate, prompt, className }: QueryTerminalProps) {
  const classes = {
    self: cx(
      "flex flex-col overflow-hidden whitespace-nowrap w-full h-full divide-y space-y-2",
      colors("divide"),
      className,
    ),
  };

  return (
    <div className={classes.self}>
      <div className="flex grow"></div>
      <div className="flex flex-col py-2">
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
