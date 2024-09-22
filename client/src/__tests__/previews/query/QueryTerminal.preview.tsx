import QueryTerminal from "@/components/query/QueryTerminal";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import { usePreviewsStore } from "../previewsStore";
import QueryPrompt from "@/components/query/QueryPrompt";
import * as data from "./query-terminal-preview-data.json";
import { QueryExecution } from "@/models/queries";

const dateRefDiff = new Date().getTime() - new Date(data.dateRef).getTime();
const _HISTORY = data.executions
  .map((execution: unknown) => new QueryExecution(execution as Partial<QueryExecution>))
  .map((execution) => {
    return { ...execution, executedAt: new Date(new Date(execution.executedAt).getTime() + dateRefDiff) };
  });

export default function QueryTerminalPreview() {
  const colorScheme = usePreviewsStore((state) => state.colorScheme);

  const handleValidate = (query: string) => {
    console.log(query);
  };

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
            prompt={<SessionQueryPrompt />}
            history={[]}
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
            prompt={<SessionQueryPrompt />}
            history={undefined}
          ></QueryTerminal>
        </PreviewBox>
      </Preview>
    </>
  );
}

function SessionQueryPrompt() {
  return (
    <QueryPrompt>
      <span className="flex space-x-2 items-center">
        <span>postgres@adworks</span>
      </span>
      <QueryPrompt.DateTimeSegment date={new Date()} />
    </QueryPrompt>
  );
}
