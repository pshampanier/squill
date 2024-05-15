import QueryPrompt, { QuerySuggestionEvent } from "@/components/query/QueryPrompt";
import PreviewBox from "../PreviewBox";
import { useState } from "react";

export default function QueryPromptPreview() {
  const [history, setHistory] = useState<string[]>([
    "SELECT * FROM table",
    "SELECT * FROM table WHERE id = 1",
    "SELECT * FROM table WHERE id = 321",
    "UPDATE table SET name = 'John' WHERE id = 1",
    `UPDATE my_table SET name = 'John' WHERE id = 1
     AND age = 21`,
    `WITH RECURSIVE t(n) AS (
    VALUES (1)
  UNION ALL
    SELECT n+1 FROM t WHERE n < 100
)
SELECT sum(n) FROM t;`,
  ]);

  const handleValidate = (value: string) => {
    setHistory((prev) => [...prev, value]);
  };

  const handleSuggestions = (event: QuerySuggestionEvent) => {
    const query = event.currentQuery;
    const suggestion = history.find(
      (suggestion) => suggestion.length > query.length && suggestion.toLowerCase().startsWith(query.toLowerCase())
    );
    event.setSuggestion(suggestion ? suggestion.slice(query.length) : null);
  };

  return (
    <PreviewBox className="items-center">
      <QueryPrompt className="w-full" onValidate={handleValidate} rows={4} onSuggest={handleSuggestions} />
      <div className="mt-4">
        <h2 className="text-lg font-semibold">History</h2>
        <ul className="mt-2">
          {history.map((query, index) => (
            <li key={index} className="text-sm">
              <pre>
                <code>{query}</code>
              </pre>
            </li>
          ))}
        </ul>
      </div>
    </PreviewBox>
  );
}
