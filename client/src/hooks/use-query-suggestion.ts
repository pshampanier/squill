import { QueryExecution } from "@/models/query-execution";
import { QueryHistoryHook, useQueryHistory } from "@/hooks/use-query-history";
import { useEffect, useRef, useState } from "react";

export type QuerySuggestionHook = {
  suggestions: QueryExecution[];
  getSuggestion(query: string): string;
  nextSuggestion(): string;
  previousSuggestion(): string;
} & QueryHistoryHook;

export function useQuerySuggestion(initialHistory: QueryExecution[]): QuerySuggestionHook {
  const { history, addQueryToHistory, updateQueryInHistory } = useQueryHistory(initialHistory);
  const [suggestions, setSuggestions] = useState<QueryExecution[]>(null);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [suggestionQuery, setSuggestionQuery] = useState("");

  const statesRef = useRef({
    history,
    suggestionIndex,
    suggestionQuery,
    suggestions,
  });

  useEffect(() => {
    statesRef.current = {
      history,
      suggestions,
      suggestionIndex,
      suggestionQuery,
    };
  }, [history, suggestionIndex, suggestionQuery, suggestions]);

  /**
   * Access to the current state of the hook.
   */
  const get = () => {
    return statesRef.current;
  };

  return {
    /**
     * The history of queries.
     */
    history,

    /**
     * The current suggestions.
     */
    suggestions,

    /**
     * Add a query to the history.
     */
    addQueryToHistory: (query: QueryExecution) => {
      // Empty the cache since a new query is added
      setSuggestions(null);
      addQueryToHistory(query);
    },

    /**
     * Update a query in the history.
     */
    updateQueryInHistory: (query: QueryExecution) => {
      // Update the cache if the query is in there.
      // Because the text of the query itself is read-only, the cache is not affected by the update but there
      // are some other properties of the query execution that can be updated.
      setSuggestions((prev) => prev.map((item) => (item.id === query.id ? new QueryExecution(query) : item)));
      updateQueryInHistory(query);
    },

    /**
     * Get the suggestion for the given query
     */
    getSuggestion: (query: string): string => {
      query = query.toLowerCase();
      let cache = get().suggestions;
      if (cache && query.startsWith(get().suggestionQuery)) {
        // We can refine the existing cache of suggestions
        cache = cache.filter((item) => item.query.toLowerCase().startsWith(query));
        setSuggestionQuery(query);
        setSuggestions(cache);
      } else {
        cache = get().history.filter((item) => item.query.toLowerCase().startsWith(query));
        setSuggestionQuery(query);
        setSuggestions(cache);
      }
      if (cache.length > 0) {
        // Return the first suggestion that is not the query itself
        const index = cache.findIndex((item) => item.query.toLowerCase() !== query);
        if (index !== -1) {
          setSuggestionIndex(index);
          return cache[index].query.slice(query.length);
        }
      }
      // No suggestion found
      setSuggestionIndex(-1);
      return "";
    },

    nextSuggestion: (): string => {
      const index = get().suggestionIndex;
      const cache = get().suggestions;
      if (index < cache.length - 1) {
        setSuggestionIndex(index + 1);
        return cache[index + 1].query.slice(get().suggestionQuery.length);
      } else {
        return "";
      }
    },

    previousSuggestion: (): string => {
      const index = get().suggestionIndex;
      const cache = get().suggestions;
      if (index > 0) {
        setSuggestionIndex(index - 1);
        return cache[index - 1].query.slice(get().suggestionQuery.length);
      } else {
        return "";
      }
    },
  };
}
