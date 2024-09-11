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
import { useCallback, useEffect, useRef, useState } from "react";

// A callback that is called when a query execution are updated or added to the history.
export type ExecutionEventHandler = (queryExecutions: QueryExecution[]) => void;

type QueryHistoryGroup = { classification: DateClassification; executions: QueryExecution[] };

type QueryHistoryTimelineProps = {
  className?: string;
  registerSubscriber: (subscriber: ExecutionEventHandler) => void;
};

/**
 * Returns the date to be used to group the query executions in the timeline.
 * The date is the execution date if available, otherwise it's the creation date.
 */
function getGroupDate(execution: QueryExecution): Date {
  return execution.executedAt || execution.createdAt;
}

export default function QueryHistoryTimeline({ className, registerSubscriber }: QueryHistoryTimelineProps) {
  // A reference to the history of query executions to be displayed
  const history = useRef<Map<string, QueryExecution>>(null);
  const [historyGroups, setHistoryGroups] = useState<QueryHistoryGroup[]>([]);

  //
  // A callback that handles the notifications when query executions are updated or added to the history.
  //
  const handleExecutionEvents = useCallback<ExecutionEventHandler>(
    (queryExecutions) => {
      if (history.current === null) {
        //
        // Initial load of the history
        //
        const classifier = generateDateClassifier();
        const groups = new Map<DateClassification, QueryExecution[]>();
        history.current = new Map<string, QueryExecution>();
        queryExecutions.forEach((execution) => {
          history.current.set(execution.id, execution);
          const classification = classifier(getGroupDate(execution));
          groups.get(classification)?.push(execution) || groups.set(classification, [execution]);
        });
        const sortedGroups = Array.from(groups.entries())
          .map(([classification, executions]) => ({
            classification,
            executions,
          }))
          .sort((a, b) => getGroupDate(a.executions[0]).getTime() - getGroupDate(b.executions[0]).getTime());
        setHistoryGroups(sortedGroups);
      } else {
        //
        // Update the history with the given query executions
        // This is called when a new query executions are added or existing ones are updated.
        // Because React states are immutable, we need to create a new `historyGroups` from the existing one.
        //
        const classifier = generateDateClassifier();
        let groups = new Array<QueryHistoryGroup>(...historyGroups);
        queryExecutions.forEach((execution) => {
          const classification = classifier(getGroupDate(execution));
          if (history.current.get(execution.id)) {
            //
            // Update the existing query execution
            //
            // 1) update the execution in the history
            history.current.set(execution.id, execution);

            // 2) update the execution in the corresponding group
            //    - the group can have changed, so we'll first look for the group where the execution is expected to be
            //      but if not found there we'll look for it in the other groups.
            const expectedGroupIndex = groups.findIndex((group) => group.classification === classification);
            let currentGroupIndex = -1;
            let currentExecutionIndex = -1;
            if (expectedGroupIndex !== -1) {
              // Check if the execution is already in the expected group
              currentExecutionIndex = groups[expectedGroupIndex].executions.findIndex((e) => e.id === execution.id);
              if (currentExecutionIndex !== -1) {
                currentGroupIndex = expectedGroupIndex;
              }
            }
            if (currentExecutionIndex === -1) {
              // Not found in the expected group, look in the other groups
              currentGroupIndex = groups.findIndex((group) => {
                currentExecutionIndex = group.executions.findIndex((e) => e.id === execution.id);
                return currentExecutionIndex !== -1;
              });
            }
            if (currentGroupIndex == -1) {
              // Execution not found, this should not happen
              console.error(`Execution ${execution.id} not found in the groups.`);
            } else if (currentGroupIndex === expectedGroupIndex) {
              // The execution is already in the expected group, update it
              groups[currentGroupIndex].executions[currentExecutionIndex] = execution;
            } else {
              // The execution is in another group, remove it from the current group and add it to the expected group
              groups[currentGroupIndex].executions.splice(currentExecutionIndex, 1);
              groups[expectedGroupIndex].executions.push(execution);
            }
          } else {
            //
            // Add a new query execution
            //
            // 1) add the execution to the history
            history.current.set(execution.id, execution);
            // 2) add the new execution to the corresponding group
            const groupIndex = groups.findIndex((group) => group.classification === classification);
            if (groupIndex === -1) {
              groups.push({ classification, executions: [execution] });
            } else {
              groups[groupIndex].executions.push(execution);
            }
          }
          // 3) Because we may have added a new group, we need to sort the groups by date.
          groups = groups.sort(
            (a, b) => getGroupDate(a.executions[0]).getTime() - getGroupDate(b.executions[0]).getTime(),
          );
          setHistoryGroups(groups);
        });
      }
    },
    [historyGroups],
  );

  useEffect(() => {
    registerSubscriber(handleExecutionEvents);
  }, [historyGroups]);

  return (
    <Timeline className={className}>
      {historyGroups.map((group, index, array) => (
        <QueryHistoryTimelineGroup
          key={group.classification}
          queryExecutions={group.executions}
          dateClassification={group.classification}
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
      date: queryExecution.executedAt || queryExecution.createdAt,
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
  date,
  dateClassification,
  executionTime,
}: {
  date: Date;
  dateClassification: DateClassification;
  executionTime?: number;
}) {
  return (
    <ul className="list-none flex flex-row items-center h-full text-xs">
      <li className="flex text-divider">
        <ExecutedAt date={date} dateClassification={dateClassification} />
      </li>
      {executionTime && (
        <li className="flex text-divider items-center">
          <StopwatchIcon className="mr-1" />
          {formatDuration(executionTime * 1_000_000)[0]}
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
