import { QueryExecution } from "@/models/queries";
import { useState } from "react";

/**
 * States & actions returned by the `useQueryHistory` hook.
 */
export type QueryHistoryHook = {
  /**
   * The query history.
   */
  history: QueryExecution[];

  /**
   * Add a query to the history.
   */
  addQueryToHistory: (query: QueryExecution) => void;

  /**
   * Update a query in the history.
   *
   * The query to be update in the history is identified by the `id` property.
   * Neither the query in the history nor the query to be updated will be mutated, instead a new query will be created.
   */
  updateQueryInHistory: (query: QueryExecution) => void;
};

/**
 * A hook to manage the query history.
 *
 * @param initialHistory The initial history to start with.
 */
export function useQueryHistory(initialHistory?: QueryExecution[]): QueryHistoryHook {
  const [history, setHistory] = useState<QueryExecution[]>(initialHistory || []);
  return {
    history,
    addQueryToHistory: (query: QueryExecution) => {
      setHistory((prev) => [...prev, query]);
    },
    updateQueryInHistory: (query: QueryExecution) => {
      setHistory((prev) => {
        return prev.map((item) => (item.id === query.id ? query : item));
      });
    },
  };
}
