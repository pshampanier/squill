import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import * as data from "./query-terminal-preview-data.json";
import { QueryExecution } from "@/models/query-execution";
import QueryHistoryTimeline, { ExecutionEventHandler } from "@/components/query/QueryHistoryTimeline";
import { useRef } from "react";
import Button from "@/components/core/Button";

const dateRefDiff = new Date().getTime() - new Date(data.dateRef).getTime();
const HISTORY = data.executions
  .map((execution: unknown) => new QueryExecution(execution as Partial<QueryExecution>))
  .map((execution) => {
    return { ...execution, executedAt: new Date(new Date(execution.executedAt).getTime() + dateRefDiff) };
  });

export default function QueryHistoryTimelinePreview() {
  const executionEventHandler = useRef<ExecutionEventHandler>(null);

  const registerSubscriber = (handler: ExecutionEventHandler) => {
    if (handler && executionEventHandler.current === null) {
      // The first subscriber will receive the history immediately
      executionEventHandler.current = handler;
      handler(HISTORY);
    } else {
      executionEventHandler.current = handler;
    }
  };

  const handleAdd = () => {
    const pendingExecution = new QueryExecution({
      id: Math.random().toString(36).substring(7),
      createdAt: new Date(),
      query: "UPDATE users SET name = 'John Doe' WHERE id = 1",
      status: "pending",
    });
    executionEventHandler.current([pendingExecution]);
    setTimeout(() => {
      const runningExecution = new QueryExecution({ ...pendingExecution, status: "running", executedAt: new Date() });
      executionEventHandler.current([runningExecution]);
      setTimeout(() => {
        const completedExecution = new QueryExecution({
          ...pendingExecution,
          status: "completed",
          affectedRows: 123,
          executionTime: (new Date().getTime() - runningExecution.executedAt.getTime()) / 1000,
        });
        executionEventHandler.current([completedExecution]);
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
        <QueryHistoryTimeline registerSubscriber={registerSubscriber} />
      </PreviewBox>
    </Preview>
  );
}
