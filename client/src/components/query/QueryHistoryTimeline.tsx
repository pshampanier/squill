import { QueryExecution } from "@/models/query-execution";
import Timeline from "@/components/core/Timeline";
import {
  DateClassification,
  formatDateClassification,
  formatDuration,
  formatRelativeDate,
  generateDateClassifier,
} from "@/utils/time";
import QueryOutput from "@/components/query/QueryOutput";
import SuccessIcon from "@/icons/true.svg?react";
import ErrorIcon from "@/icons/false.svg?react";
import PauseIcon from "@/icons/pause.svg?react";
import StopwatchIcon from "@/icons/stopwatch.svg?react";
import Spinner from "@/components/core/Spinner";
import { useEffect, useState } from "react";

type QueryHistoryTimelineProps = {
  className?: string;
  history: Array<QueryExecution>;
};

export default function QueryHistoryTimeline({ history, className }: QueryHistoryTimelineProps) {
  const classifier = generateDateClassifier();
  const groupsByDate = Array.from(
    history
      .reduce<Map<DateClassification, QueryExecution[]>>((acc, execution: QueryExecution) => {
        const classification = classifier(execution.executedAt);
        acc.set(classification, [...(acc.get(classification) || []), execution]);
        return acc;
      }, new Map<DateClassification, QueryExecution[]>())
      .entries(),
  ).sort((a, b) => a[1][0].executedAt.getTime() - b[1][0].executedAt.getTime());

  return (
    <Timeline className={className}>
      {groupsByDate.map(([classification, executions], index, array) => (
        <QueryHistoryTimelineGroup
          key={classification}
          queryExecutions={executions}
          dateClassification={classification}
          open={index === array.length - 1}
        />
      ))}
    </Timeline>
  );
}

function QueryHistoryTimelineGroup({
  queryExecutions,
  dateClassification,
  open,
}: {
  queryExecutions: QueryExecution[];
  dateClassification: DateClassification;
  open?: boolean;
}) {
  return (
    <Timeline.Group title={formatDateClassification(dateClassification)} defaultOpen={open}>
      {queryExecutions.map((execution) => (
        <QueryHistoryTimelineItem
          key={execution.id}
          queryExecution={execution}
          dateClassification={dateClassification}
        />
      ))}
    </Timeline.Group>
  );
}

function QueryHistoryTimelineItem({
  queryExecution,
  dateClassification,
}: {
  queryExecution: QueryExecution;
  dateClassification: DateClassification;
}) {
  const status: {
    severity: "message" | "info" | "success" | "warning" | "danger";
    label: string;
    icon: React.ReactNode;
    title: React.ReactNode;
  } = (() => {
    const titleProps = {
      executedAt: queryExecution.executedAt,
      dateClassification,
    };
    switch (queryExecution.status) {
      case "completed":
        return {
          severity: "success",
          label: "Success",
          icon: <SuccessIcon />,
          title: <Title {...titleProps} executionTime={queryExecution.executionTime} />,
        };
      case "pending":
        return {
          severity: "info",
          label: "Pending",
          icon: <PauseIcon />,
          title: <Title {...titleProps} />,
        };
      case "running":
        return {
          severity: "message",
          label: "Running",
          icon: <Spinner />,
          title: <Title {...titleProps} />,
        };
      case "failed":
        return {
          severity: "danger",
          label: "Failed",
          icon: <ErrorIcon />,
          title: <Title {...titleProps} />,
        };
      case "cancelled":
        return {
          severity: "warning",
          label: "Cancelled",
          icon: <ErrorIcon />,
          title: <Title {...titleProps} />,
        };
    }
  })();

  return (
    <Timeline.Item {...status}>
      <QueryOutput queryExecution={queryExecution} />
    </Timeline.Item>
  );
}

function Title({
  executedAt,
  dateClassification,
  executionTime,
}: {
  executedAt: Date;
  dateClassification: DateClassification;
  executionTime?: number;
}) {
  return (
    <ul className="list-none flex flex-row items-center h-full text-xs">
      <li className="flex text-divider">
        <ExecutedAt date={executedAt} dateClassification={dateClassification} />
      </li>
      {executionTime && (
        <li className="flex text-divider items-center">
          <StopwatchIcon className="mr-1" />
          {formatDuration(executionTime)[0]}
        </li>
      )}
    </ul>
  );
}

/**
 * Displays when the query was executed, as a date or a relative period of time such as 'yesterday', '1 hour ago', etc.
 *
 * The display value is updated every minute, hour, or day as needed.
 */
function ExecutedAt({
  date,
  dateClassification,
  fnGetDate = () => new Date(),
}: {
  date: Date;
  dateClassification: DateClassification;
  fnGetDate?: () => Date;
}) {
  const [displayValue, setDisplayValue] = useState<string>("");
  useEffect(() => {
    switch (dateClassification) {
      case "today":
      case "yesterday": {
        let refreshInterval: number; // number of milliseconds when the display value should be refreshed.
        const now = fnGetDate();
        const [text, precision] = formatRelativeDate(date, { currentDate: now });
        switch (precision) {
          case "day": {
            // Because the text can be 'yesterday', we need to refresh the value every day.
            // return the time only
            setDisplayValue(date.toLocaleString("en-US", { hour: "numeric", minute: "numeric" }));
            return;
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
      }
      case "this_week": {
        // return the day of the week and time
        setDisplayValue(date.toLocaleString("en-US", { weekday: "long", hour: "numeric", minute: "numeric" }));
        break;
      }
      case "last_week": {
        // return the day of the week and time
        setDisplayValue(
          date.toLocaleString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
          }),
        );
        break;
      }
      case "before_last_year":
      case "last_year": {
        // full date, with the year
        setDisplayValue(
          date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
          }),
        );
        break;
      }
      default:
        // full date, without the year
        setDisplayValue(
          date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
          }),
        );
        break;
    }
  }, [displayValue]);
  return <span>{displayValue}</span>;
}
