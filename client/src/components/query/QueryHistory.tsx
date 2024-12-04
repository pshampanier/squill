import cx from "classix";
import { useVirtualizer, VirtualItem } from "@tanstack/react-virtual";
import { Dispatch, memo, useEffect, useReducer, useRef } from "react";
import { DateClassification, generateDateClassifier } from "@/utils/time";
import { secondary as colors } from "@/utils/colors";
import { QueryExecution } from "@/models/queries";
import { useUserStore } from "@/stores/UserStore";
import { QUERY_METADATA_SCHEMA } from "@/utils/constants";
import { TableSettings } from "@/models/user-settings";
import QueryOutput from "@/components/query/QueryOutput";
import QueryExecutionHeader from "@/components/query/QueryExecutionHeader";
import { useQueryCache } from "@/hooks/use-query-cache";

/**
 * Layout properties for an element displayed within the query history.
 *
 * If the `height` property is provided, it will be used as the height of the element, otherwise the height will be
 * calculated based on the `padding`, `marginTop`, and `lineHeight` properties.
 * All properties are optional and expected to be in pixels.
 */
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

const QUERY_HEADER_DATE_CLASSIFICATIONS: DateClassification[] = ["today", "yesterday", "this_year", "before_last_year"];

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

export default function QueryHistory({ className, onMount }: QueryHistoryProps) {
  //
  // States & Refs
  //
  const settings = useUserStore((state) => state.settings?.tableSettings);
  const rootRef = useRef<HTMLDivElement>(null);
  const [history, dispatch] = useReducer<ReducerFn>(reducer, {
    revision: 1,
    queries: new Map(),
    lastAction: null,
  });

  const { getQueryStates } = useQueryCache();

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
          const { dataframe, fetching } = getQueryStates(query);
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
                dataframe={dataframe}
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
