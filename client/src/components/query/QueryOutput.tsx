import cx from "classix";
import { QueryExecution } from "@/models/query-execution";
import Alert from "@/components/core/Alert";
import Code from "@/components/core/Code";

type QueryOutputProps = {
  className?: string;
  queryExecution: QueryExecution;
};

export default function QueryOutput({ className, queryExecution }: QueryOutputProps) {
  const { status, error, query } = queryExecution;
  return (
    <div className={cx("flex flex-col min-w-full w-full", className)}>
      <Code className="w-full max-h-90 overflow-scroll" language="sql" showLineNumbers={status === "failed"}>
        {query}
      </Code>
      {status === "failed" && (
        <Alert severity="danger" icon className="w-full mt-2 mb-2">
          <pre className="text-xs">{error.message}</pre>
        </Alert>
      )}
    </div>
  );
}
