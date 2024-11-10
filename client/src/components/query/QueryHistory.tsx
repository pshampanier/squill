import cx from "classix";
import { useVirtualizer, VirtualItem } from "@tanstack/react-virtual";
import { Dispatch, memo, useCallback, useEffect, useReducer, useRef } from "react";
import { DateClassification, generateDateClassifier } from "@/utils/time";
import { secondary as colors } from "@/utils/colors";
import { QueryExecution } from "@/models/queries";
import QueryOutput from "@/components/query/QueryOutput";
import QueryExecutionHeader from "@/components/query/QueryExecutionHeader";
import { useUserStore } from "@/stores/UserStore";
import Connections from "@/resources/connections";
import { QUERY_METADATA_SCHEMA } from "@/utils/constants";
import { TableSettings } from "@/models/user-settings";
import { QueryCache } from "@/utils/query-cache";

type Layout = {
  height?: number;
  padding?: number;
  marginTop?: number;
  lineHeight?: number;
};

function calcHeight(layout: Layout, lines: number) {
  if (!lines) {
    return 0;
  } else if (layout.height) {
    return layout.height;
  } else {
    return (layout.padding ?? 0) * 2 + (layout.marginTop ?? 0) + layout.lineHeight * lines;
  }
}

// FIXME: This should use the settings.
function calcRowsHeight(query: QueryExecution, _settings: TableSettings) {
  const schema = query.metadata?.[QUERY_METADATA_SCHEMA];
  if (schema) {
    const header = 26;
    const rows = Math.min(query.affectedRows, 20) * 20; /* row height */
    const footer = query.affectedRows === 0 ? 20 /* row height */ : 0;
    return 8 /* mt-2 */ + header + rows + footer;
  } else {
    return 0;
  }
}

/**
 * Memoized version of QueryOutput
 */
const MemoizedQueryOutput = memo(QueryOutput, (prev, next) => {
  return prev.query.status === next.query.status;
});

const QUERY_HEADER_DATE_CLASSIFICATIONS: DateClassification[] = ["today", "yesterday", "this_year", "before_last_year"];

interface QueryHistoryState {
  revision: number;
  queries: Map<string, QueryExecution>;
  cache: QueryCache;
  lastAction: null | "update" | "remove" | "set";
}

export interface QueryHistoryAction {
  type: "update" | "remove" | "set";
  queries?: QueryExecution[];
}

type QueryHistoryProps = {
  className?: string;
  onMount?: (dispatcher: Dispatch<QueryHistoryAction>) => void;
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
          if (state.cache.has(query.id)) {
            if (query.storageBytes > 0 && (!previousQuery || previousQuery.storageBytes === 0)) {
              state.cache.fetch(query.id, () => {
                return Connections.getQueryExecutionData(
                  query.connectionId,
                  query.id,
                  0,
                  Math.min(20, query.affectedRows),
                );
              });
            }
          }
        }
      });
      return { revision: state.revision + 1, queries, cache: state.cache, lastAction: action.type };
    }

    /**
     * Remove the queries from the history.
     */
    case "remove": {
      const queries = new Map(state.queries);
      action.queries?.forEach((query) => {
        queries.delete(query.id);
      });
      return { revision: state.revision + 1, queries, cache: state.cache, lastAction: action.type };
    }

    /**
     * Set the queries in the history. This will replace the current history with the provided queries.
     */
    case "set": {
      const queries = new Map<string, QueryExecution>();
      action.queries?.forEach((query) => {
        queries.set(query.id, query);
      });
      return { revision: state.revision + 1, queries, cache: state.cache, lastAction: action.type };
    }
  }
}

export default function QueryHistory({ className, onMount }: QueryHistoryProps) {
  //
  // States & Refs
  //
  const settings = useUserStore((state) => state.settings?.tableSettings);
  const rootRef = useRef<HTMLDivElement>(null);
  const [history, dispatch] = useReducer<(state: QueryHistoryState, action: QueryHistoryAction) => QueryHistoryState>(
    reducer,
    {
      revision: 1,
      queries: new Map(),
      cache: new QueryCache(),
      lastAction: null,
    },
  );

  const historyItems = getSortedHistory(history);

  const virtualizer = useVirtualizer({
    count: historyItems.length,
    gap: 2,
    getScrollElement: () => rootRef.current,
    estimateSize: (index: number) => {
      const query = historyItems[index];
      const header = calcHeight({ height: 32 }, 1);
      const statement = calcHeight({ lineHeight: 18 }, query.query?.split("\n").length);
      const error = calcHeight({ marginTop: 8, padding: 8, lineHeight: 16 }, query.error?.message?.split("\n").length);
      const rows = calcRowsHeight(query, settings);
      const estimatedSize = header + (8 /* padding */ + statement + error + rows + 8); /* padding */
      // console.debug("QueryHistory (sizing)", { index, estimatedSize, header, statement, error, rows });
      return estimatedSize;
    },
    getItemKey(index) {
      return historyItems[index].id;
    },
  });

  useEffect(() => {
    onMount?.(dispatch);
  }, []);

  useEffect(() => {
    // scroll to the bottom when first initialized
    rootRef.current?.scrollTo({
      top: rootRef.current?.scrollHeight,
      behavior: history.lastAction === "set" ? "instant" : "smooth",
    });
  }, [history]);

  const handleOnLoad = useCallback((query: QueryExecution) => {
    const cache = history.cache;
    const ready = query.storageBytes > 0;
    if (!cache.has(query.id)) {
      cache.set(query.id);
    }
    if (ready) {
      return cache.get(query.id, () => {
        return Connections.getQueryExecutionData(query.connectionId, query.id, 0, Math.min(20, query.affectedRows));
      });
    } else {
      return cache.getPromise(query.id);
    }
  }, []);

  const handleOnCancel = useCallback((key: string) => {
    history.cache.cancel(key);
  }, []);

  // Because we are potentially going to process a large number of queries, we can optimize a bit by using reusing the
  // same date classifier for all queries.
  const dateClassifier = generateDateClassifier(QUERY_HEADER_DATE_CLASSIFICATIONS);

  const numberFormat = new Intl.NumberFormat("en-US");

  const classes = {
    root: cx("h-full overflow-y-auto", className),
    inner: "relative w-full",
    query: "absolute top-0 left-0 w-full flex flex-col",
    output: cx("rounded p-2", colors("background")),
  };

  const virtualItems: VirtualItem[] = virtualizer.getVirtualItems();
  console.debug("QueryHistory", { virtualItems });
  return (
    <div ref={rootRef} data-component="query-history" className={classes.root} tabIndex={0}>
      <div className={classes.inner} style={{ height: virtualizer.getTotalSize() }}>
        {virtualItems.map((virtualItem) => {
          const query = historyItems[virtualItem.index];
          const date = query.createdAt;
          const dateClassification = dateClassifier(date);
          return (
            <div
              key={virtualItem.key}
              className={classes.query}
              style={{
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <QueryExecutionHeader
                date={date}
                dateClassifications={QUERY_HEADER_DATE_CLASSIFICATIONS}
                defaultClassification={dateClassification}
                status={query.status}
                executionTime={query.executionTime}
                affectedRows={query.affectedRows}
                numberFormatter={numberFormat}
              />
              <MemoizedQueryOutput
                query={query}
                className={classes.output}
                settings={settings}
                onLoad={handleOnLoad}
                onCancel={handleOnCancel}
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
