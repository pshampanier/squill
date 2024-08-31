import cx from "classix";
import React, { useEffect, useState } from "react";
import CaretRightIcon from "@/icons/caret-right.svg?react";
import ClockIcon from "@/icons/clock.svg?react";

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
            className="flex h-full items-center px-2 cursor-default"
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

/**
 * A segment that displays the current date and time.
 *
 * This component will use the given date to calculate the current date and time. The date is updated every second. This
 * is intended to be used to display a current time that is not necessary the same as the current time on the client
 * (such as a server time).
 *
 * The date and time are displayed in the local timezone. By default only the time is displayed, the date is displayed
 * on hover.
 */
function DateTimeSegment({ date }: { date: Date }) {
  const [dateText, setDateText] = useState<string>("");
  const [timeText, setTimeText] = useState<string>("");
  const reference = new Date();

  const updateText = () => {
    const diff = reference.getTime() - new Date().getTime();
    const now = new Date(date.getTime() - diff);

    setDateText(
      now.toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    );
    setTimeText(now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));
  };

  useEffect(() => {
    updateText();
    const intervalId = setInterval(() => {
      updateText();
    }, 1000);
    return () => clearInterval(intervalId);
  }, [date]);

  return (
    <span className="flex space-x-2 items-center group">
      <ClockIcon />
      <span className="whitespace-nowrap transition-all duration-300 ease-in-out max-w-0 opacity-0 group-hover:opacity-100 group-hover:max-w-96">
        {dateText}
      </span>
      <span>{timeText}</span>
    </span>
  );
}

QueryPrompt.DateTimeSegment = DateTimeSegment;

export default QueryPrompt;
