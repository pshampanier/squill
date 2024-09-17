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
import { useEffect, useReducer, Dispatch, useState } from "react";

export interface QueryHistoryAction {
  type: "update" | "remove" | "clear";
  queries: QueryExecution[];
}

interface QueryHistoryState {
  revision: number;
  queries: Map<string, QueryExecution>;
  groups: QueryHistoryGroup[];
}

interface QueryHistoryGroup {
  classification: DateClassification;
  queries: QueryExecution[];
}

function reducer(state: QueryHistoryState, action: QueryHistoryAction): QueryHistoryState {
  console.debug(`QueryHistoryReducer: action: ${action.type}, revision: ${state.revision}`);
  const classifier = generateDateClassifier();
  const queries = new Map<string, QueryExecution>(state.queries);
  const groups = state.groups.slice();
  // A flag to indicate if the state has been modified.
  // This is used to avoid unnecessary re-renders when the state has not changed.
  let modified = false;
  switch (action.type) {
    case "update": {
      if (state.queries.size === 0) {
        //
        // Initial load of the history
        //
        action.queries.forEach((query) => {
          modified = true;
          queries.set(query.id, query);
          const classification = classifier(query.createdAt);
          groups.find((group) => group.classification === classification)?.queries.push(query) ||
            groups.push({ classification, queries: [query] });
        });
      } else {
        //
        // Update the history with the given query queries
        // This is called when a new query queries are added or existing ones are updated.
        // Because React states are immutable, we need to create a new `historyGroups` from the existing one.
        //
        action.queries.forEach((query) => {
          console.debug(
            `QueryHistoryReducer: updating query: id=${query.id}, , revision=${query.revision}, status=${query.status}`,
          );
          const classification = classifier(query.createdAt);
          const lastQueryRevision = queries.get(query.id);
          if (lastQueryRevision?.revision > query.revision) {
            console.debug(`QueryHistoryReducer: ignoring outdated query: id=${query.id}, revision=${query.revision}`);
          } else if (lastQueryRevision?.revision === query.revision) {
            console.debug(`QueryHistoryReducer: ignoring query: id=${query.id}, revision=${query.revision}`);
          } else if (lastQueryRevision) {
            //
            // Update the existing query execution
            //
            modified = true;

            // 1) update the execution in the history
            queries.set(query.id, query);

            // 2) update the execution in the corresponding group
            //    - the group can have changed, so we'll first look for the group where the execution is expected to be
            //      but if not found there we'll look for it in the other groups.
            const expectedGroupIndex = groups.findIndex((group) => group.classification === classification);
            let currentGroupIndex = -1;
            let currentQueryIndex = -1;
            if (expectedGroupIndex !== -1) {
              // Check if the execution is already in the expected group
              currentQueryIndex = groups[expectedGroupIndex].queries.findIndex((e) => e.id === query.id);
              if (currentQueryIndex !== -1) {
                currentGroupIndex = expectedGroupIndex;
              }
            }
            if (currentQueryIndex === -1) {
              // Not found in the expected group, look in the other groups
              currentGroupIndex = groups.findIndex((group) => {
                currentQueryIndex = group.queries.findIndex((e) => e.id === query.id);
                return currentQueryIndex !== -1;
              });
            }
            if (currentGroupIndex == -1) {
              // Execution not found, this should not happen
              console.error(`Execution ${query.id} not found in the groups.`);
            } else if (currentGroupIndex === expectedGroupIndex) {
              // The execution is already in the expected group, update it
              groups[currentGroupIndex].queries[currentQueryIndex] = query;
            } else {
              // The execution is in another group, remove it from the current group and add it to the expected group
              groups[currentGroupIndex].queries.splice(currentQueryIndex, 1);
              groups[expectedGroupIndex].queries.push(query);
            }
          } else {
            //
            // Add a new query execution
            //
            modified = true;

            // 1) add the execution to the history
            queries.set(query.id, query);
            // 2) add the new execution to the corresponding group
            const groupIndex = groups.findIndex((group) => group.classification === classification);
            if (groupIndex === -1) {
              groups.push({ classification, queries: [query] });
            } else {
              groups[groupIndex].queries.push(query);
            }
          }
        });
      }
      break;
    }
    default: {
      console.error(`Unsupported action type: ${action.type}`);
    }
  }
  if (!modified) {
    console.debug("QueryHistoryReducer: state not modified");
    return state;
  } else {
    return {
      revision: state.revision + 1,
      queries,
      groups: groups.sort((a, b) => a.queries[0].createdAt.getTime() - b.queries[0].createdAt.getTime()),
    };
  }
}

type QueryHistoryTimelineProps = {
  className?: string;

  /**
   * A callback to register the dispatcher function to update the history.
   *
   * The dispatcher function is then expected to be called every time the history needs to be updated.
   */
  registerDispatcher: (dispatcher: Dispatch<QueryHistoryAction>) => void;
};

export default function QueryHistoryTimeline({ className, registerDispatcher }: QueryHistoryTimelineProps) {
  // The history of query queries.
  //
  // Used by the event handler to update the history. Because the event handler can be called multiple times in between
  // the renders we cannot use states and make .
  // - `queries` is a map of query queries indexed by their id.
  // - `groups` is a list of query queries grouped by date as expected by the timeline component.

  const [history, dispatch] = useReducer(reducer, {
    revision: 1,
    queries: new Map(),
    groups: [],
  });

  useEffect(() => {
    registerDispatcher(dispatch);
  }, []);

  return (
    <Timeline className={className}>
      {history.groups.map((group, index, array) => (
        <QueryHistoryTimelineGroup
          key={group.classification}
          queries={group.queries}
          dateClassification={group.classification}
          open={index === array.length - 1}
        />
      ))}
    </Timeline>
  );
}

function QueryHistoryTimelineGroup({
  queries,
  dateClassification,
  open,
}: {
  queries: QueryExecution[];
  dateClassification: DateClassification;
  open?: boolean;
}) {
  return (
    <Timeline.Group title={formatDateClassification(dateClassification)} defaultOpen={open}>
      {queries.map((execution) => (
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
