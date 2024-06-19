import cx from "classix";
import { QueryExecution } from "@/models/query-execution";
import Alert from "@/components/core/Alert";
import Code from "@/components/core/Code";

type QueryOutputProps = {
  className?: string;
  queryExecution: QueryExecution;
};

export default function QueryOutput({ className, queryExecution }: QueryOutputProps) {
  const { status, errorMessage, query } = queryExecution;
  return (
    <div className={cx("flex flex-col min-w-full w-full", className)}>
      <Code className="w-full max-h-90 overflow-scroll" language="sql" showLineNumbers={status === "error"}>
        {query}
      </Code>
      {status === "error" && (
        <Alert severity="danger" icon className="w-full mt-2">
          <pre className="text-xs">{errorMessage}</pre>
        </Alert>
      )}
    </div>
  );
}
