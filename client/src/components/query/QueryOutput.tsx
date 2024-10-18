import cx from "classix";
import { QueryExecution } from "@/models/queries";
import Alert from "@/components/core/Alert";
import Code from "@/components/core/Code";
import TableView from "../dataset/table-view";

type QueryOutputProps = {
  className?: string;
  queryExecution: QueryExecution;
};

export default function QueryOutput({ className, queryExecution }: QueryOutputProps) {
  const { status, error, query, withResultSet } = queryExecution;
  return (
    <div className={cx("flex flex-col min-w-full w-full space-y-1", className)}>
      <Code className="w-full max-h-90 overflow-scroll" language="sql" showLineNumbers={false}>
        {query}
      </Code>
      {withResultSet && (status === "pending" || status === "running") && (
        <div className="flex w-full">
          <TableView dataframe={null} />
        </div>
      )}
      {status === "failed" && (
        <Alert severity="danger" className="w-full mt-2 mb-2" border="accent" variant="ghost" size="sm">
          <pre className="text-xs">{error.message}</pre>
        </Alert>
      )}
    </div>
  );
}
