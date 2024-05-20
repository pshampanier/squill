import QueryInput, { QuerySuggestionEvent } from "@/components/query/QueryInput";
import PreviewBox from "../PreviewBox";
import { QueryExecution } from "@/models/query-execution";
import { useQuerySuggestion } from "@/hooks/use-query-suggestion";
import QuerySuggestionMenu from "@/components/query/QuerySuggestionMenu";
import Preview from "../Preview";
import Kbd from "@/components/core/Kbd";
import { usePreviewsStore } from "../previewsStore";

const NOW = new Date().getTime();
const HISTORY = [
  new QueryExecution({
    id: "1",
    query: "SELECT * FROM table",
    executedAt: new Date(NOW - 86400 * 30),
  }),
  new QueryExecution({
    id: "2",
    query: "SELECT * FROM table WHERE id = 1",
    executedAt: new Date(NOW - 86400 * 10),
  }),
  new QueryExecution({
    id: "3",
    query: "SELECT * FROM table WHERE id = 321",
    executedAt: new Date(NOW - 86400),
  }),
  new QueryExecution({
    id: "4",
    query: "UPDATE table SET name = 'John' WHERE id = 1",
    executedAt: new Date(NOW - 3600 * 6),
  }),
  new QueryExecution({
    id: "5",
    query: `UPDATE my_table SET name = 'John' WHERE id = 1\n  AND age = 21`,
    executedAt: new Date(NOW - 86400),
    affectedRows: 32300,
  }),
  new QueryExecution({
    id: "6",
    query:
      "WITH RECURSIVE t(n) AS (\n    VALUES (1)\n  UNION ALL\n    SELECT n+1 FROM t WHERE n < 100\n)\nSELECT sum(n) FROM t",
    executedAt: new Date(NOW),
  }),
];

export default function QueryPromptPreview() {
  const colorScheme = usePreviewsStore((state) => state.colorScheme);
  const { suggestions, addQueryToHistory, getSuggestion } = useQuerySuggestion(HISTORY);

  const handleValidate = (value: string) => {
    addQueryToHistory(
      new QueryExecution({
        query: value,
        executedAt: new Date(),
      })
    );
  };

  const handleSuggestions = (event: QuerySuggestionEvent) => {
    const suggestion = getSuggestion(event.currentQuery);
    event.setSuggestion(suggestion);
  };

  return (
    <>
      {/*
       * Terminal
       */}
      <Preview>
        <Preview.Title>Terminal</Preview.Title>
        <Preview.Description>
          With <code className="text-xs">mode=&quot;terminal&quot;</code> the input is in terminal mode, validation is
          called when the user hits <Kbd shortcut={["Meta+[Enter]", "Ctrl+[Enter]"]} /> or just{" "}
          <Kbd shortcut={"[Enter]"} /> when the input ends with a semicolon.
        </Preview.Description>
        <PreviewBox className="items-center h-60">
          <QueryInput
            className="w-full border border-gray-100 dark:border-gray-700"
            mode="terminal"
            colorScheme={colorScheme}
            rows={4}
            onValidate={handleValidate}
            onSuggest={handleSuggestions}
          />
          <QuerySuggestionMenu suggestions={suggestions} />
        </PreviewBox>
      </Preview>
      {/*
       * Editor
       */}
      <Preview>
        <Preview.Title>Editor</Preview.Title>
        <Preview.Description>
          With <code className="text-xs">mode=&quot;editor&quot;</code> the input is in editor mode.
        </Preview.Description>
        <PreviewBox className="items-center h-96">
          <QueryInput className="w-full h-full" mode="editor" colorScheme={colorScheme} />
          <QuerySuggestionMenu suggestions={suggestions} />
        </PreviewBox>
      </Preview>
    </>
  );
}
