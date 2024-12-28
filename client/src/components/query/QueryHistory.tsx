import cx from "classix";
import { useVirtualizer, VirtualItem } from "@tanstack/react-virtual";
import { Dispatch, memo, useEffect, useMemo, useReducer, useRef } from "react";
import { QueryExecution } from "@/models/queries";
import { CommandEvent } from "@/utils/commands";
import { DataFrame } from "@/utils/dataframe";
import { useUserStore } from "@/stores/UserStore";
import { QUERY_METADATA_SCHEMA } from "@/utils/constants";
import { useQueryCache } from "@/hooks/use-query-cache";
import QueryOutput from "@/components/query/QueryOutput";
import QueryExecutionHeader from "@/components/query/QueryExecutionHeader";

/**
 * Memoized version of QueryOutput
 *
 * Re-render only when the query status or the schema of the query chan
 */
const MemoizedQueryOutput = memo(QueryOutput, (prev, next) => {
  return (
    prev.query.status === next.query.status &&
    prev.query.storageRows === next.query.storageRows &&
    prev.query.metadata?.[QUERY_METADATA_SCHEMA] === next.query.metadata?.[QUERY_METADATA_SCHEMA] &&
    prev.fetching === next.fetching
  );
});

const MemoizedQueryExecutionHeader = memo(QueryExecutionHeader, (prev, next) => {
  return (
    prev.query.createdAt === next.query.createdAt &&
    prev.query.status === next.query.status &&
    prev.query.executionTime === next.query.executionTime &&
    prev.query.affectedRows === next.query.affectedRows
  );
});

interface QueryHistoryState {
  revision: number;

  /**
   * All queries currently available in the history.
   */
  queries: Map<string, QueryExecution>;

  lastAction: null | "update" | "remove" | "set";
}

export interface QueryHistoryAction {
  type: "update" | "remove" | "set";

  /**
   * A collection of queries (used by `update` `remove` and `set` actions).
   */
  queries?: QueryExecution[];
}

type QueryHistoryProps = {
  className?: string;
  onMount?: (dispatcher: Dispatch<QueryHistoryAction>) => void;
  onCommand: (event: CommandEvent, query: QueryExecution) => void;
};

function reducer(state: QueryHistoryState, action: QueryHistoryAction): QueryHistoryState {
  console.debug("QueryHistoryReducer", { action, revision: state.revision });
  switch (action.type) {
    /**
     * Insert or update the queries in the history.
     */
    case "update": {
      const queries = new Map(state.queries);
      action.queries?.forEach((query) => {
        const previousQuery = queries.get(query.id);
        if (!previousQuery || query.revision > previousQuery.revision) {
          queries.set(query.id, query);
        }
      });
      return { ...state, revision: state.revision + 1, queries, lastAction: action.type };
    }

    /**
     * Remove the queries from the history.
     * We are not removing yet the data from the cache, that will be done later when the TableView is unmounted.
     */
    case "remove": {
      const queries = new Map(state.queries);
      action.queries?.forEach((query) => {
        queries.delete(query.id);
      });
      return { ...state, revision: state.revision + 1, queries, lastAction: action.type };
    }

    /**
     * Set the queries in the history. This will replace the current history with the provided queries.
     */
    case "set": {
      const queries = new Map<string, QueryExecution>();
      action.queries?.forEach((query) => {
        queries.set(query.id, query);
      });
      return { ...state, revision: state.revision + 1, queries, lastAction: action.type };
    }
  }
}

type ReducerFn = (state: QueryHistoryState, action: QueryHistoryAction) => QueryHistoryState;

export default function QueryHistory({ className, onCommand, onMount }: QueryHistoryProps) {
  //
  // States & Refs
  //
  const settings = useUserStore((state) => state.settings);
  const rootRef = useRef<HTMLDivElement>(null);
  const [history, dispatch] = useReducer<ReducerFn>(reducer, {
    revision: 1,
    queries: new Map(),
    lastAction: null,
  });

  const { getQueryStates } = useQueryCache({ fetchLimit: settings?.historySettings.maxRows ?? 20 });

  // The settings to be used to display tables in the history.
  const tableSettings = useMemo(() => {
    if (settings?.historySettings.useDefaultTableSettings) {
      return settings.tableSettings;
    } else {
      return settings?.historySettings.tableSettings;
    }
  }, [settings]);

  // The maximum number of rows to display in the history for the result set preview.
  const maxRows = settings?.historySettings.maxRows ?? 20;

  const historyItems = getSortedHistory(history);

  const virtualizer = useVirtualizer({
    count: historyItems.length,
    gap: 2,
    getScrollElement: () => rootRef.current,
    estimateSize: (index: number) => {
      const query = historyItems[index];
      const headerSize = QueryExecutionHeader.estimateSize();
      const outputSize = QueryOutput.estimateSize(query, maxRows, tableSettings) + 8 * 2; /* p-2 */
      const estimatedSize = headerSize + outputSize;
      // console.debug("QueryHistory (sizing)", { index, estimatedSize, headerSize, outputSize });
      return estimatedSize;
    },
    getItemKey(index) {
      return historyItems[index].id;
    },
  });

  useEffect(() => {
    onMount?.(dispatch);
  }, []);

  //
  // If the table density changes, we need to update the virtualizer.
  //
  useEffect(() => {
    virtualizer.measure();
  }, [tableSettings?.density]);

  //
  // Scroll to the bottom of the history when the history changes.
  //
  // The behavior is different depending on the amount of content that need to be scrolled. If the new position of the
  // scrollbar is outside the current view we scroll instantly, otherwise we scroll smoothly.
  useEffect(() => {
    if (rootRef.current && history.lastAction !== "remove") {
      const clientHeight = rootRef.current.clientHeight;
      const currentScrollPosition = rootRef.current.scrollTop + clientHeight;
      const targetScrollPosition = rootRef.current.scrollHeight;
      const offset = targetScrollPosition - currentScrollPosition;
      const behavior = offset > clientHeight ? "instant" : "smooth";
      rootRef.current.scrollTo({
        top: targetScrollPosition,
        behavior,
      });
    }
  }, [history]);

  // Because we are potentially going to process a large number of queries, we can optimize a bit by using reusing the
  // same date classifier & NumberFormat for all queries.
  const dateClassifier = QueryExecutionHeader.generateDefaultDateClassifier("en-US");
  const numberFormat = new Intl.NumberFormat("en-US");

  const classes = {
    root: cx("h-full overflow-y-auto focus:outline-none", className),
    inner: "relative w-full",
    query: "absolute top-0 left-0 w-full flex flex-col group",
    output: "p-2",
  };

  const virtualItems: VirtualItem[] = virtualizer.getVirtualItems();
  console.debug("QueryHistory", { virtualItems });
  return (
    <div ref={rootRef} data-component="query-history" className={classes.root} tabIndex={0}>
      <div className={classes.inner} style={{ height: virtualizer.getTotalSize() }}>
        {virtualItems.map((virtualItem) => {
          const query = historyItems[virtualItem.index];
          const { dataframe, fetching } = getQueryStates(query);
          const previewDataframe: DataFrame = {
            ...dataframe,
            getSizeHint() {
              return Math.min(maxRows, dataframe.getSizeHint());
            },
          };
          return (
            <div
              key={virtualItem.key}
              className={classes.query}
              style={{
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <MemoizedQueryExecutionHeader
                query={query}
                mode="compact"
                dateClassifier={dateClassifier}
                numberFormatter={numberFormat}
                onCommand={(event: CommandEvent) => {
                  onCommand(event, query);
                }}
                locale={"en-US"}
              />
              <MemoizedQueryOutput
                query={query}
                className={classes.output}
                settings={tableSettings}
                dataframe={previewDataframe}
                fetching={fetching}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Returns the history of queries sorted by the property `createdAt` in descending order.
 */
function getSortedHistory(history: QueryHistoryState) {
  return Array.from(history.queries.values()).sort((a, b) => a.createdAt?.getTime() - b.createdAt?.getTime());
}
