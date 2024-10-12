import QueryTerminal from "@/components/query/QueryTerminal";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import { usePreviewsStore } from "../previewsStore";
import * as data from "./query-terminal-preview-data.json";
import { QueryHistoryAction } from "@/components/query/QueryHistory";
import { QueryExecution } from "@/models/queries";
import { useCallback } from "react";

export default function QueryTerminalPreview() {
  const colorScheme = usePreviewsStore((state) => state.colorScheme);

  const handleValidate = (query: string) => {
    console.log(query);
  };

  const handleHistoryDidMount = useCallback((dispatcher: React.Dispatch<QueryHistoryAction>, size?: number) => {
    const dateRefDiff = new Date().getTime() - new Date(data.dateRef).getTime();
    const history = data.executions
      .map((execution: unknown) => new QueryExecution(execution as Partial<QueryExecution>))
      .map((execution) => {
        const createdAt = new Date(new Date(execution.createdAt).getTime() + dateRefDiff);
        return { ...execution, revision: 0, createdAt, executedAt: createdAt };
      });

    dispatcher({ type: "set", queries: history.slice(0, size || history.length) });
  }, []);

  return (
    <>
      {/*
       * Empty Terminal
       */}
      <Preview>
        <Preview.Title>A clear Terminal</Preview.Title>
        <Preview.Description>A Terminal with no entry in the timeline</Preview.Description>
        <PreviewBox className="items-center h-[300px]">
          <QueryTerminal
            onValidate={handleValidate}
            colorScheme={colorScheme}
            onHistoryMount={(d) => handleHistoryDidMount(d, 2)}
          />
        </PreviewBox>
      </Preview>
      {/*
       * Terminal with history
       */}
      <Preview>
        <Preview.Title>A clear Terminal</Preview.Title>
        <Preview.Description>A Terminal with no entry in the timeline</Preview.Description>
        <PreviewBox className="items-center h-[800px]">
          <QueryTerminal
            onValidate={handleValidate}
            colorScheme={colorScheme}
            onHistoryMount={(d) => handleHistoryDidMount(d)}
          ></QueryTerminal>
        </PreviewBox>
      </Preview>
    </>
  );
}
