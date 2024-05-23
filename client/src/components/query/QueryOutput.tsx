import cx from "classix";
import { primary as colors } from "@/utils/colors";
import { addTime, formatDuration, formatRelativeDate, truncDate } from "@/utils/time";
import { QueryExecution } from "@/models/query-execution";
import React, { useEffect, useState } from "react";
import Alert from "@/components/core/Alert";
import Code from "@/components/core/Code";
import Spinner from "@/components/core/Spinner";
import Button from "@/components/core/Button";
import StopWatchIcon from "@/icons/stopwatch.svg?react";

type QueryOutputProps = {
  className?: string;
  queryExecution: QueryExecution;
};

export default function QueryOutput({ className, queryExecution }: QueryOutputProps) {
  const { executedAt, status, errorMessage, executionTime, query } = queryExecution;
  const classes = {
    container: cx(className, "relative"),
    toolbar: cx(
      "absolute top-0 right-0 flex flex-row flex-shrink-1 text-2xs ml-auto space-x-1 select-none px-2 py-1 rounded",
      colors("background"),
      "backdrop-filter backdrop-blur-sm bg-opacity-60 dark:bg-opacity-60"
    ),
  };
  return (
    <div className={classes.container}>
      <Divider className={classes.toolbar}>
        {false && <Button className="h-3 text-2xs inline-flex" text="Cancel" variant="ghost"></Button>}
        {(status === "pending" || status === "cancelled") && <StatusIndicator status={status} />}
        {status === "success" && <ExecutionTime microseconds={executionTime} />}
        {status !== "running" && <ExecutedAt date={executedAt} />}
        {status === "running" && (
          <div className="flex flex-row space-x-0.5 items-center">
            <Spinner size="xs" />
            <ExecutedAt date={executedAt} />
          </div>
        )}
      </Divider>
      <div className="inline-block min-w-full">
        <Code className="w-full" language="sql" showLineNumbers={status === "error"}>
          {query}
        </Code>
        {status === "error" && (
          <Alert severity="danger" icon className="w-full mt-2">
            <pre className="text-xs">{errorMessage}</pre>
          </Alert>
        )}
      </div>
    </div>
  );
}

/**
 * Displays when the query was executed, as a date or a relative period of time such as 'yesterday', '1 hour ago', etc.
 *
 * The display value is updated every minute, hour, or day as needed.
 */
function ExecutedAt({ date, fnGetDate = () => new Date() }: { date: Date; fnGetDate?: () => Date }) {
  const [displayValue, setDisplayValue] = useState<string>("");
  useEffect(() => {
    let refreshInterval: number; // number of milliseconds when the display value should be refreshed.
    const now = fnGetDate();
    const [text, precision] = formatRelativeDate(date, { currentDate: now });
    switch (precision) {
      case "day": {
        // Because the text can be 'yesterday', we need to refresh the value every day.
        refreshInterval = addTime(truncDate(now, "day"), 1, "day").getTime() - now.getTime();
        break;
      }
      case "hour": {
        // 'x hours ago', we need to refresh the value every minute.
        refreshInterval = 60 * 1000;
        break;
      }
      case "minute":
      case "second": {
        // 'x minutes ago' or 'x seconds ago', we need to refresh the value every second.
        refreshInterval = 1000;
        break;
      }
    }
    const interval = setInterval(() => {
      // When it's time to refresh the value, we reset the display value to trigger a re-render.
      // This will not cause a flicker because the new value is set immediately after.
      setDisplayValue("");
    }, refreshInterval);
    setDisplayValue(text);
    return () => clearInterval(interval);
  }, [displayValue]);
  return <span>{displayValue}</span>;
}

/**
 * Displays the execution time such as `32 seconds`, `1 hour 2 minutes`, etc.
 */
function ExecutionTime({ microseconds }: { microseconds: number }) {
  const [text] = formatDuration(microseconds);
  return (
    <div className="flex flex-row items-center">
      <StopWatchIcon />
      <span>{text}</span>
    </div>
  );
}

/**
 * Displays a 'Cancelled' or 'Pending' indicator.
 */
function StatusIndicator({ status }: { status: QueryExecution["status"] }) {
  const classes = cx(
    "rounded px-2 py-0.5",
    status === "cancelled" && colors("warning:background", "warning:text"),
    status === "pending" && colors("info:background", "info:text")
  );
  return (
    <span className={classes}>
      {status === "cancelled" && "Cancelled"}
      {status === "pending" && "Pending"}
    </span>
  );
}

function Divider({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      {React.Children.toArray(children).map((child, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span>|</span>}
          {child}
        </React.Fragment>
      ))}
    </div>
  );
}
