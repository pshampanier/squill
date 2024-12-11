import { QueryExecution } from "@/models/queries";
import { Connections } from "@/resources/connections";
import { DataFrame } from "@/utils/dataframe";
import { Table } from "apache-arrow";
import { useEffect, useState } from "react";

const DEFAULT_CACHE_SIZE = 100;
const DEFAULT_CACHE_MAX_CONCURRENT_FETCHES = 5;
const DEFAULT_FETCH_LIMIT = 1000;

type QueryCacheProps = {
  cacheSize?: number;
  maxConcurrentFetches?: number;
  fetchLimit?: number;
};

type QueryCacheHook = {
  getQueryStates: (query: QueryExecution) => { dataframe: DataFrame; fetching: boolean };
};

type Key = {
  connectionId: string;
  queryId: string;
  offset: number;
};

export type CacheEntry = {
  /**
   * The key of the entry in the cache.
   */
  key: Key;

  /**
   * The status of the query in the cache.
   *
   * - `pending`: The entry is had been added to the cache but its fetch has not started.
   * - `fetching`: The entry is currently being fetched.
   * - `success`: The data have been fetched and are available in the cache.
   * - `error`: The entry has been fetched but an error occurred.
   */
  status: "pending" | "fetching" | "success" | "error";

  /**
   * The timestamp of the last access to the entry.
   */
  lastAccessed: number;

  /**
   * The data available in the cache when the status is `success`.
   */
  table?: Table;

  /**
   * The error that occurred when fetching failed.
   */
  error?: unknown;
};

/**
 * A React hook that caches the rows of a query execution.
 */
export function useQueryCache({
  cacheSize = DEFAULT_CACHE_SIZE,
  maxConcurrentFetches = DEFAULT_CACHE_MAX_CONCURRENT_FETCHES,
  fetchLimit = DEFAULT_FETCH_LIMIT,
}: QueryCacheProps = {}): QueryCacheHook {
  const [entries, setEntries] = useState<CacheEntry[]>([]);

  // Every time the cache is updated, we check if there are any pending entries that can be fetched.
  useEffect(() => {
    let modified = false;
    let activeFetch = entries.reduce((count, entry) => count + (entry.status === "fetching" ? 1 : 0), 0);
    while (activeFetch < maxConcurrentFetches) {
      const next = entries.find((entry) => entry.status === "pending");
      if (next) {
        modified = true;
        activeFetch += 1;
        next.status = "fetching";
        console.debug("use-query-cache", { id: next.key.queryId, offset: next.key.offset, status: next.status });
        Connections.getQueryExecutionData(next.key.connectionId, next.key.queryId, next.key.offset, fetchLimit)
          .then((table) => {
            next.status = "success";
            next.table = table;
            console.debug("use-query-cache", { id: next.key.queryId, offset: next.key.offset, status: next.status });
          })
          .catch((error) => {
            next.status = "error";
            next.error = error;
            console.debug("use-query-cache", { id: next.key.queryId, offset: next.key.offset, status: next.status });
          })
          .finally(() => {
            setEntries((prev) => [...prev]);
          });
      } else {
        // there is no pending entries
        break;
      }
    }
    if (modified) {
      setEntries((prev) => {
        const next = prev.sort((a, b) => b.lastAccessed - a.lastAccessed).slice(0, cacheSize);
        console.debug("use-query-cache", { size: next.length, activeFetch });
        return next;
      });
    }
  }, [entries]);

  const getQueryStates = (query: QueryExecution) => {
    // Filter the cache to get all the entries that belong to the query execution.
    const localCache = entries.filter(
      (entry) => entry.key.connectionId === query.connectionId && entry.key.queryId === query.id,
    );
    // The last used entry is stored in a variable to avoid having to search the cache every time a row is requested.
    let lastUsed: CacheEntry = null;
    return {
      fetching: localCache.find((entry) => entry.status === "fetching") !== undefined,
      dataframe: {
        getSizeHint() {
          return query.storageRows;
        },
        getRow(index: number) {
          const keyOffset = index - (index % fetchLimit);
          if (!lastUsed || lastUsed.key.offset !== keyOffset) {
            lastUsed = localCache.find((entry) => entry.key.offset === keyOffset);
            console.debug("use-query-cache: lastUsed", { id: query.id, offset: keyOffset, status: lastUsed?.status });
          }
          if (lastUsed?.table === undefined) {
            return null;
          } else {
            return lastUsed.table.get(index - keyOffset)?.toArray();
          }
        },
        loadRows(offset: number, limit: number): Promise<void> {
          // 1) Find all the keys that need to be fetched. Because `limit` can be larger than `fetchLimit` or the range
          //    requested can be across 2 ranges, there might be more than one range to fetch.
          const keys: Array<Key> = [];
          const key: Key = {
            connectionId: query.connectionId,
            queryId: query.id,
            offset: offset - (offset % fetchLimit),
          };
          do {
            keys.push({ ...key });
            key.offset += fetchLimit;
          } while (key.offset + fetchLimit < offset + limit);
          // 2) Checking in the local cache of all keys are available, if not add them to the cache this way we are use
          //    them in the current rendering cycle instead of having to wait for the next one. This is a performance
          //    optimization, allowing to have lastUsed to be set instead of having to search on the cache every time
          //    a row is requested via `getRow()`.
          keys.forEach((key) => {
            const entry = localCache.find(
              (entry) =>
                entry.key.connectionId === key.connectionId &&
                entry.key.queryId === key.queryId &&
                entry.key.offset === key.offset,
            );
            if (!entry) {
              const newEntry: CacheEntry = { key, status: "pending", lastAccessed: performance.now() };
              localCache.push(newEntry);
            }
          });
          // 3) Update the state of the cache to trigger the fetch of the new keys.
          //    Because `setEntry` is not synchronous, we can't rely of the localCache to check if the entry is already
          //    in the state or not, so we have to re-check all keys regardless if they were found in the local cache or
          //    or not.
          //    This will also update the `lastAccessed` of the entry is already in the cache.
          setEntries((prev) => {
            let next: Array<CacheEntry> = null;
            keys.forEach((key) => {
              const entry = prev.find(
                (entry) =>
                  entry.key.connectionId === key.connectionId &&
                  entry.key.queryId === key.queryId &&
                  entry.key.offset === key.offset,
              );
              if (!entry) {
                next = next ?? [...prev];
                const newEntry: CacheEntry = { key, status: "pending", lastAccessed: performance.now() };
                console.debug("use-query-cache", { id: key.queryId, offset: key.offset, status: "pending" });
                next.push(newEntry);
              } else {
                entry.lastAccessed = performance.now();
              }
            });
            return next ?? prev;
          });
          return Promise.resolve();
        },
      },
    };
  };

  return {
    getQueryStates,
  };
}
