import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import { usePreviewsStore } from "../previewsStore";
import QueryInput from "@/components/query/QueryInput";
import Code from "@/components/core/Code";
import { useState } from "react";

const SQL_CODE = `-- hljs-comment
CREATE TABLE Employees (
    -- hljs-attribute
    ID INT PRIMARY KEY NOT NULL,
    NAME TEXT NOT NULL,
    AGE INT NOT NULL,
    ADDRESS CHAR(50),
    SALARY REAL
);

-- hljs-keyword
INSERT INTO Employees (ID, NAME, AGE, ADDRESS, SALARY)
VALUES (1, 'Paul', 32, 'California', 20000.00 );

-- hljs-keyword
SELECT * FROM Employees;

-- hljs-keyword
UPDATE Employees SET ADDRESS = 'Texas' WHERE ID = 1;

-- hljs-keyword
DELETE FROM Employees WHERE ID = 1;

-- hljs-keyword
DROP TABLE Employees;
`;

export default function SyntaxHighlightingPreview() {
  const colorScheme = usePreviewsStore((state) => state.colorScheme);
  const [value, setValue] = useState<string>(SQL_CODE);

  return (
    <>
      {/*
       * SQL code
       */}
      <Preview>
        <Preview.Title>Syntax Highlighting</Preview.Title>
        <Preview.Description>
          Syntax Highlighting should be as similar as possible between the{" "}
          <strong>
            <code>Code</code>
          </strong>{" "}
          component and the <strong>Monaco editor</strong>.
        </Preview.Description>
        <PreviewBox>
          <div className="flex w-full">
            <div className="w-1/2">
              <Code language="sql" showLineNumbers={true}>
                {value}
              </Code>
            </div>
            <div className="w-1/2">
              <QueryInput
                className="w-full h-full"
                mode="editor"
                colorScheme={colorScheme}
                value={value}
                onChange={setValue}
              />
            </div>
          </div>
        </PreviewBox>
      </Preview>
    </>
  );
}
