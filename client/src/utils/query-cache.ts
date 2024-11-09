import { Table } from "apache-arrow";

const QUERY_CACHE_MAX_ACTIVE_QUERIES = 5;
const QUERY_CACHE_MAX_SIZE = 100;

export type QueryFetcher = () => Promise<Table>;
type QueueEntry = {
  key: string;
  fetch: QueryFetcher;
};

type CachedQuery = {
  lastAccessed: number;

  /**
   * The status of the query in the cache.
   *
   * - `pending`: The query is in the cache but not yet added to the queue.
   * - `queued`: The query is in the queue to be fetched but the fetch is not started yet.
   * - `fetching`: The query is currently being fetched.
   * - `ready`: The query has been fetched and the data are available in the cache.
   * - `error`: The query has been fetched but an error occurred.
   */
  status: "pending" | "queued" | "fetching" | "success" | "error";
  table: Table | null;

  /**
   * The error that occurred when fetching the query failed.
   */
  error?: unknown;

  resolvers: {
    resolve: (value: Table) => void;
    reject: (reason: unknown) => void;
  };
};

/**
 * A LIFO LRU cache of queries.
 */
export class QueryCache {
  /**
   * The cache of queries.
   */
  private cache: Map<string, CachedQuery> = new Map();

  /**
   * The queue of queries to be fetched.
   *
   * The queue is a list of query ids. The queries are fetched in the opposite order they are added to the queue (LIFO).
   */
  private queue: QueueEntry[] = [];

  /**
   * Returns the number of active fetching in progress.
   */
  private get activeCount() {
    return this.queue.reduce((count, entry) => {
      const cached = this.cache.get(entry.key);
      return count + (cached.status === "fetching" ? 1 : 0);
    }, 0);
  }

  private cleanup() {}

  private setResolvers(cached: CachedQuery): Promise<Table> {
    return new Promise<Table>((resolve, reject) => {
      cached.resolvers = {
        resolve,
        reject,
      };
    });
  }

  fetch(key: string, fetch: QueryFetcher) {
    const cached = this.cache.get(key);
    if (cached.status === "pending") {
      // The query is not yet in the queue, we can add it.
      cached.status = "queued";
      this.queue.unshift({ key, fetch });
    }

    if (this.activeCount >= QUERY_CACHE_MAX_ACTIVE_QUERIES) {
      return;
    }

    cached.status = "fetching";
    fetch()
      .then((table) => {
        cached.status = "success";
        cached.table = table;
        cached.resolvers?.resolve(table);
        // we can execute the next query.
        const next = this.queue.find((entry) => this.cache.get(entry.key).status === "queued");
        if (next) {
          this.fetch(next.key, next.fetch);
        }
      })
      .catch((error) => {
        cached.status = "error";
        cached.error = error;
        cached.resolvers?.reject(error);
      })
      .finally(() => {
        // Remove the query from the queue...
        cached.resolvers = null;
        this.queue = this.queue.filter((entry) => entry.key !== key);
      });
  }

  /**
   * Add a query to the cache.
   */
  set(key: string) {
    if (this.cache.size >= QUERY_CACHE_MAX_SIZE) {
      // Remove the least recently used query from the cache.
      this.cleanup();
    }
    const cached: CachedQuery = {
      lastAccessed: performance.now(),
      status: "pending",
      table: null,
      resolvers: null,
    };
    this.cache.set(key, cached);
  }

  getPromise(key: string) {
    return this.setResolvers(this.cache.get(key));
  }

  get(key: string, fetch: QueryFetcher): Promise<Table> {
    const cached = this.cache.get(key);
    cached.lastAccessed = performance.now();
    if (cached.status === "success") {
      return Promise.resolve(cached.table);
    } else if (cached.status === "error") {
      return Promise.reject(cached.error);
    } else {
      // Record the promise to notify the caller when the query is ready.
      const promise = this.getPromise(key);
      this.fetch(key, fetch);
      return promise;
    }
  }

  cancel(key: string) {
    const cached = this.cache.get(key);
    if (cached) {
      cached.resolvers = null;
      if (cached.status === "pending") {
        this.queue = this.queue.filter((entry) => entry.key !== key);
      }
    }
  }

  /**
   * Return true if the given key is in the cache.
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }
}
