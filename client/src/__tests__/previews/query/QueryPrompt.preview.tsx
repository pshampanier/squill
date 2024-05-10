import QueryPrompt from "@/components/query/QueryPrompt";
import PreviewBox from "../PreviewBox";
import { useState } from "react";

export default function QueryPromptPreview() {
  const [history, setHistory] = useState<string[]>([]);

  function handleValidate(value: string) {
    setHistory((prev) => [...prev, value]);
  }
  return (
    <PreviewBox className="items-center">
      <QueryPrompt className="w-full" onValidate={handleValidate} rows={4} />
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
