import * as data from "./query-terminal-preview-data.json";
import QueryHistory, { QueryHistoryAction } from "@/components/query/QueryHistory";
import { QueryExecution } from "@/models/queries";
import { useCallback } from "react";

export default function QueryHistoryExample() {
  const handleDidMount = useCallback((dispatcher: React.Dispatch<QueryHistoryAction>) => {
    const dateRefDiff = new Date().getTime() - new Date(data.dateRef).getTime();
    const history = data.executions
      .map((execution: unknown) => new QueryExecution(execution as Partial<QueryExecution>))
      .map((execution) => {
        const createdAt = new Date(new Date(execution.createdAt).getTime() + dateRefDiff);
        return { ...execution, revision: 0, createdAt, executedAt: createdAt };
      });

    dispatcher({ type: "set", queries: history });
  }, []);

  return <QueryHistory onMount={handleDidMount} />;
}
