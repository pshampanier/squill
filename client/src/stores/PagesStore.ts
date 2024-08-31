export type State = {
  /**
   * History of the query execution for a page.
   * The key is the page ID and the value is an array of query execution IDs.
   */
  history: Map<string, string[]>;
};

export type Actions = {
  executeQuery: (pageId: string, query: string) => Promise<void>;
};
