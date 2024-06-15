import cx from "classix";
import React from "react";
import CaretRightIcon from "@/icons/caret-right.svg?react";

/**
 * The number of colors available for the query prompt.
 */
const MAX_COLORS = 10;

type QueryPromptProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * A query prompt that displays a series of information.
 *
 * Each child is displayed as a separate segment with a different background color.
 *
 * @example
 *    ----------------\----------\
 *   | user@database   | 10:22 AM |
 *    ----------------/----------/
 */
function QueryPrompt({ children, className }: QueryPromptProps) {
  const classes = {
    self: cx(
      "flex flex-row items-center h-6 text-xs font-bold rounded-l overflow-hidden whitespace-nowrap select-none",
      className,
    ),
  };

  return (
    <div className={classes.self}>
      {React.Children.toArray(children).map((child, index) => (
        <span className="flex items-center justify-center h-full" key={index}>
          <span
            className="flex h-full items-center px-2"
            style={{
              color: "var(--query-prompt-text)",
              backgroundColor: `var(--query-prompt-color-${(index % MAX_COLORS) + 1})`,
            }}
          >
            {child}
          </span>
          <CaretRightIcon
            className="flex flex-none h-6 w-3"
            style={{
              backgroundColor:
                index < React.Children.count(children) - 1 &&
                `var(--query-prompt-color-${((index + 1) % MAX_COLORS) + 1})`,
              color: `var(--query-prompt-color-${(index % MAX_COLORS) + 1})`,
            }}
          />
        </span>
      ))}
    </div>
  );
}

export default QueryPrompt;
