import { DateClassification, formatDuration, formatRelativeDate, generateDateClassifier } from "@/utils/time";
import cx from "classix";
import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "@/utils/strings";
import { QueryExecution, QueryExecutionStatus } from "@/models/queries";
import { secondary } from "@/utils/colors";
import { ColorsContext } from "@/stores/ColorsContext";
import Spinner from "@/components/core/Spinner";
import Toolbar from "@/components/core/Toolbar";
import CommandButton from "@/components/core/CommandButton";
import SuccessIcon from "@/icons/true.svg?react";
import ErrorIcon from "@/icons/false.svg?react";
import PauseIcon from "@/icons/pause.svg?react";
import StopwatchIcon from "@/icons/stopwatch.svg?react";
import TrashIcon from "@/icons/trash.svg?react";
import CopyIcon from "@/icons/clipboard-copy.svg?react";
import ArrowsPointingOutIcon from "@/icons/arrows-pointing-out.svg?react";
import ReplayIcon from "@/icons/replay.svg?react";
import { CommandEvent, registerCommand } from "@/utils/commands";
import { useCommand } from "@/hooks/use-commands";

const LOCATE_STR_YESTERDAY_EN = "Yesterday, {0}";

registerCommand(
  { name: "query.open", description: "Open query", icon: ArrowsPointingOutIcon },
  { name: "query.rerun", description: "Rerun query", icon: ReplayIcon },
  { name: "query.copy", description: "Copy query", icon: CopyIcon },
  { name: "query.history.delete", description: "Delete from history", icon: TrashIcon },
);

type QueryExecutionHeaderProps = {
  query: QueryExecution;
  date: Date;
  dateClassifications: DateClassification[];
  defaultClassification: DateClassification;
  numberFormatter?: Intl.NumberFormat;
  onCommand: (event: CommandEvent) => void;
  className?: string;
};

export function QueryExecutionHeader({
  className,
  date,
  dateClassifications,
  defaultClassification,
  query: { status, executionTime, affectedRows, withResultSet },
  numberFormatter,
  onCommand,
}: QueryExecutionHeaderProps) {
  const ref = useRef<HTMLDivElement>(null);
  useCommand({ ref, onCommand });

  return (
    <ColorsContext.Provider value={secondary}>
      <div
        tabIndex={0}
        ref={ref}
        data-component="query-execution-header"
        className={cx(
          "query-header h-8 rounded flex flex-row items-center",
          secondary("background", "text"),
          className,
        )}
      >
        <ul className="list-none flex flex-row flex-none items-center h-8 text-xs select-none whitespace-nowrap">
          <li className="flex text-divider items-center">
            <Status status={status} className="ml-1 mr-2" />
            <FormattedDate
              date={date}
              dateClassification={defaultClassification}
              dateClassifications={dateClassifications}
            />
          </li>
          {status === "completed" && (
            <li className="flex text-divider items-center">
              <StopwatchIcon className="mr-1" />
              {formatDuration(executionTime * 1_000_000, { style: "short", precision: "millisecond" })[0]}
            </li>
          )}
          {(affectedRows > 0 || status === "completed") && (
            <li className="flex text-divider items-center">
              <span className="select-text">{numberFormatter.format(affectedRows)}</span>&nbsp;
              {(affectedRows > 1 && "rows") || "row"}
              {!withResultSet && " affected"}
            </li>
          )}
        </ul>
        <Toolbar
          size="md"
          className="ml-auto mr-0.5 opacity-0 transition-opacity duration-500 delay-200 group-hover:opacity-100"
        >
          <CommandButton size="md" command="query.rerun" />
          <CommandButton size="md" command="query.copy" />
          <CommandButton size="md" command="query.history.delete" />
          <CommandButton size="md" command="query.open" disabled={!withResultSet || status === "failed"} />
        </Toolbar>
      </div>
    </ColorsContext.Provider>
  );
}

/**
 * Displays when the query was executed, as a date or a relative period of time such as 'yesterday', '1 hour ago', etc.
 *
 * The display value is updated every minute, hour, or day as needed.
 */
function FormattedDate({
  date,
  dateClassifications,
  dateClassification: defaultDateClassification,
}: {
  date: Date;
  dateClassifications: DateClassification[];
  dateClassification: DateClassification;
}) {
  const [displayValue, setDisplayValue] = useState<string>();
  const [lastRefreshAt, setLastRefreshAt] = useState<Date>();

  const getUpdates = useCallback(
    (defaultDateClassification: DateClassification): [text: string, refreshAt: Date | undefined] => {
      const now = new Date();

      // If the date classification is not provided, generate it based on the date.
      const dateClassification =
        defaultDateClassification || generateDateClassifier(dateClassifications, { currentDate: now })(date);

      switch (dateClassification) {
        case "yesterday": {
          // 'yesterday, 1:23 PM', we need to refresh the value at the next day.
          return [
            format(LOCATE_STR_YESTERDAY_EN, date.toLocaleString("en-US", { hour: "numeric", minute: "numeric" })),
            new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          ];
        }
        case "today": {
          const [text, precision] = formatRelativeDate(date);
          switch (precision) {
            case "hour": {
              // 'x hours ago', we need to refresh the value at the next hour.
              return [text, new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1)];
            }
            case "minute": {
              // 'x minutes ago', we need to refresh the value at the next minute.
              return [
                text,
                new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1),
              ];
            }
            case "second": {
              // 'x seconds ago', we need to refresh the value every 10 secs but we want to fall back at a time that is a
              // multiple of 10 (eg: 20 seconds ago, 30 seconds ago, etc).

              // Find the last digit of date, then calculate the next multiple of 10 that is greater than the current date.
              const lastSecondDigit = date.getSeconds() % 10;
              const nextSeconds =
                Math.max(now.getSeconds(), date.getSeconds()) -
                (Math.max(now.getSeconds(), date.getSeconds()) % 10) +
                10 +
                lastSecondDigit;

              return [
                text,
                new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  now.getDate(),
                  now.getHours(),
                  now.getMinutes(),
                  nextSeconds,
                  date.getMilliseconds(),
                ),
              ];
            }
          }
          break;
        }
        case "this_year": {
          // 'dec 31, 1:23 PM', we need to refresh the value at the next year.
          return [
            date.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
            }),
            undefined,
          ];
        }
        case "before_last_year": {
          // 'dec 31 2023, 1:23 PM', we don't need to refresh the value.
          return [
            date.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "numeric",
            }),
            undefined,
          ];
        }
      }
    },
    [],
  );
  useEffect(() => {
    // At the first render `lastRefreshAt` is undefined, we are using the provided data classification, otherwise we
    // need getUpdates to re-calculate it.
    const [text, nextRefresh] = getUpdates(displayValue === undefined ? defaultDateClassification : undefined);
    if (nextRefresh) {
      // We need to schedule a refresh of the display value.
      // This is done by setting a timeout to the next refresh date, which will update the state `lastRefreshAt`,
      // triggering a re-evaluation of the `useEffect` hook.
      const timeout = Math.abs(nextRefresh.getTime() - new Date().getTime());
      console.debug("FormattedDate, scheduling refresh", {
        text,
        timeout: timeout / 1_000,
        date,
        nextRefresh,
      });
      const timer = setTimeout(() => {
        setLastRefreshAt(nextRefresh);
      }, timeout);
      setDisplayValue(text);
      return () => clearTimeout(timer);
    } else {
      // If the date is not going to change, we don't need to schedule a refresh, we can just update the display value.
      setDisplayValue(text);
    }
  }, [lastRefreshAt]);
  return <span data-component="formatted-date">{displayValue}</span>;
}

type StatusProps = {
  className?: string;
  status: QueryExecutionStatus;
};

function Status({ status, className }: StatusProps) {
  let properties: { severity: string; label: string; icon: JSX.Element };
  switch (status) {
    case "completed":
      properties = {
        severity: "success",
        label: "Success",
        icon: <SuccessIcon />,
      };
      break;

    case "pending":
      properties = {
        severity: "info",
        label: "Pending",
        icon: <PauseIcon />,
      };
      break;

    case "running":
      properties = {
        severity: "message",
        label: "Running",
        icon: <Spinner size="sm" />,
      };
      break;

    case "failed":
      properties = {
        severity: "danger",
        label: "Failed",
        icon: <ErrorIcon />,
      };
      break;
    case "cancelled":
      properties = {
        severity: "warning",
        label: "Cancelled",
        icon: <ErrorIcon />,
      };
      break;
  }

  return (
    <div className={cx("status", className)}>
      <span className="status-icon">{properties.icon}</span>
      <span className={"status-text"}>{properties.label}</span>
    </div>
  );
}

QueryExecutionHeader.estimateSize = function () {
  return 32 /* h-8: 32px */;
};

export default QueryExecutionHeader;
