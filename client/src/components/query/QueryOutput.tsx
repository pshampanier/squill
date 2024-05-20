import { QueryExecution } from "@/models/query-execution";
import Alert from "@/components/core/Alert";
import Code from "@/components/core/Code";

type QueryOutputProps = {
  className?: string;
  queryExecution: QueryExecution;
};

export default function QueryOutput({ className, queryExecution }: QueryOutputProps) {
  return (
    <div className={className}>
      <div className="inline-block min-w-full">
        <Code className="w-full" language="sql" showLineNumbers={queryExecution.status === "error"}>
          {queryExecution.query}
        </Code>
        {queryExecution.status === "error" && (
          <Alert severity="danger" icon className="w-full mt-2">
            <pre className="text-xs">{queryExecution.errorMessage}</pre>
          </Alert>
        )}
      </div>
    </div>
  );
}
