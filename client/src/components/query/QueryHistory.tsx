import cx from "classix";
import { Dispatch, useEffect, useReducer } from "react";
import { DateClassification, generateDateClassifier } from "@/utils/time";
import { secondary as colors } from "@/utils/colors";
import { QueryExecution } from "@/models/queries";
import QueryOutput from "@/components/query/QueryOutput";
import QueryExecutionHeader from "@/components/query/QueryExecutionHeader";

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
  const [history, dispatch] = useReducer(reducer, {
    revision: 1,
    queries: new Map(),
  });

  useEffect(() => {
    onMount?.(dispatch);
  }, []);

  // Because we are potentially going to process a large number of queries, we can optimize a bit by using reusing the
  // same date classifier for all queries.
  const dateClassifier = generateDateClassifier(QUERY_HEADER_DATE_CLASSIFICATIONS);

  const numberFormat = new Intl.NumberFormat("en-US");

  const classes = {
    self: cx("flex flex-col space-y-2", className),
    query: "flex flex-col space-y-1",
    output: cx("rounded p-2", colors("background")),
  };

  return (
    <div data-component="query-history" className={classes.self} tabIndex={0}>
      {getSortedHistory(history).map((query) => {
        const date = query.createdAt;
        const dateClassification = dateClassifier(date);
        return (
          <div key={query.id} className={classes.query}>
            <QueryExecutionHeader
              date={date}
              dateClassifications={QUERY_HEADER_DATE_CLASSIFICATIONS}
              defaultClassification={dateClassification}
              status={query.status}
              executionTime={query.executionTime}
              affectedRows={query.affectedRows}
              numberFormatter={numberFormat}
            />
            <QueryOutput queryExecution={query} className={classes.output} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Returns the history of queries sorted by the property `createdAt` in descending order.
 */
function getSortedHistory(history: QueryHistoryState) {
  return Array.from(history.queries.values()).sort((a, b) => a.createdAt?.getTime() - b.createdAt?.getTime());
}
