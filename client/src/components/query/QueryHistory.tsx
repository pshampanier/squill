import cx from "classix";
import { useVirtualizer, VirtualItem } from "@tanstack/react-virtual";
import { Dispatch, memo, useEffect, useReducer, useRef } from "react";
import { DateClassification, generateDateClassifier } from "@/utils/time";
import { secondary as colors } from "@/utils/colors";
import { QueryExecution } from "@/models/queries";
import QueryOutput from "@/components/query/QueryOutput";
import QueryExecutionHeader from "@/components/query/QueryExecutionHeader";

/**
 * Memoized version of QueryOutput
 */
const MemoQueryOutput = memo(QueryOutput, (prev, next) => {
  return prev.query.revision === next.query.revision;
});

const QUERY_HEADER_DATE_CLASSIFICATIONS: DateClassification[] = ["today", "yesterday", "this_year", "before_last_year"];

interface QueryHistoryState {
  revision: number;
  queries: Map<string, QueryExecution>;
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
        }
      });
      return { revision: state.revision + 1, queries };
    }

    /**
     * Remove the queries from the history.
     */
    case "remove": {
      const queries = new Map(state.queries);
      action.queries?.forEach((query) => {
        queries.delete(query.id);
      });
      return { revision: state.revision + 1, queries };
    }

    /**
     * Set the queries in the history. This will replace the current history with the provided queries.
     */
    case "set": {
      const queries = new Map<string, QueryExecution>();
      action.queries?.forEach((query) => {
        queries.set(query.id, query);
      });
      return { revision: state.revision + 1, queries };
    }
  }
}

export default function QueryHistory({ className, onMount }: QueryHistoryProps) {
  //
  // States & Refs
  //
  const rootRef = useRef<HTMLDivElement>(null);
  const [history, dispatch] = useReducer(reducer, {
    revision: 1,
    queries: new Map(),
  });

  const historyItems = getSortedHistory(history);

  const layout = {
    padding: 8,
    header: 20,
    body: {
      padding: 8,
      statementLineHeight: 18,
      error: {
        padding: 8,
        lineHeight: 16,
      },
    },
  };

  const virtualizer = useVirtualizer({
    count: historyItems.length,
    gap: 2,
    getScrollElement: () => rootRef.current,
    estimateSize: (index: number) => {
      const query = historyItems[index];
      let estimateSize = layout.header + (layout.padding + layout.body.padding) * 2;
      estimateSize += (query.query?.split("\n").length ?? 0) * layout.body.statementLineHeight;
      if (query.error) {
        estimateSize +=
          layout.body.error.padding * 2 + (query.error.message?.split("\n").length ?? 0) * layout.body.error.lineHeight;
      }
      return estimateSize;
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
      behavior: "instant",
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
              <MemoQueryOutput query={query} className={classes.output} />
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
