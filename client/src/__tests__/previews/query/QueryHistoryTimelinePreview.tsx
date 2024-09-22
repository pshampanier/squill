import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import * as data from "./query-terminal-preview-data.json";
import { QueryExecution } from "@/models/queries";
import QueryHistoryTimeline, { QueryHistoryAction } from "@/components/query/QueryHistoryTimeline";
import { Dispatch, useRef } from "react";
import Button from "@/components/core/Button";

const dateRefDiff = new Date().getTime() - new Date(data.dateRef).getTime();
const HISTORY = data.executions
  .map((execution: unknown) => new QueryExecution(execution as Partial<QueryExecution>))
  .map((execution) => {
    const createdAt = new Date(new Date(execution.createdAt).getTime() + dateRefDiff);
    return { ...execution, revision: 0, createdAt, executedAt: createdAt };
  });

export default function QueryHistoryTimelinePreview() {
  const counter = useRef(1);
  const queryEventHandler = useRef<Dispatch<QueryHistoryAction>>(null);
  const registerQueryEventHandler = (dispatcher: Dispatch<QueryHistoryAction>) => {
    queryEventHandler.current = dispatcher;
    dispatcher({ type: "update", queries: HISTORY });
  };

  const handleAdd = () => {
    const pendingExecution = new QueryExecution({
      id: Math.random().toString(36).substring(7),
      revision: 0,
      createdAt: new Date(),
      query: `UPDATE users SET name = 'John Doe' WHERE id = ${counter.current++}`,
      status: "pending",
    });
    console.debug("pendingExecution", pendingExecution);
    queryEventHandler.current?.call(null, {
      type: "update",
      queries: [pendingExecution],
    });
    setTimeout(() => {
      const runningExecution = new QueryExecution({
        ...pendingExecution,
        revision: pendingExecution.revision + 1,
        status: "running",
        executedAt: new Date(),
      });
      console.debug("runningExecution", runningExecution);
      queryEventHandler.current?.call(null, {
        type: "update",
        queries: [runningExecution],
      });
      setTimeout(() => {
        const completedExecution = new QueryExecution({
          ...runningExecution,
          revision: runningExecution.revision + 1,
          status: "completed",
          affectedRows: 123,
          executionTime: (new Date().getTime() - runningExecution.executedAt.getTime()) / 1000,
        });
        console.debug("completedExecution", completedExecution);
        queryEventHandler.current?.call(null, {
          type: "update",
          queries: [completedExecution],
        });
      }, 1234);
    }, 2000);
  };

  return (
    <Preview>
      <Preview.Title>A Timeline of query executions</Preview.Title>
      <PreviewBox className="items-center h-[800px]">
        <div className="flex flex-row space-x-2">
          <Button onClick={handleAdd} variant="outline" text="Add" />
        </div>
        <div className="fex flex-col grow" />
        <QueryHistoryTimeline registerDispatcher={registerQueryEventHandler} />
      </PreviewBox>
    </Preview>
  );
}
