import cx from "classix";
import { QueryExecution } from "@/models/queries";
import Alert from "@/components/core/Alert";
import Code from "@/components/core/Code";
import TableView from "../dataset/table-view";
import { Table } from "apache-arrow";
import { useEffect, useState } from "react";
import Connections from "@/resources/connections";

type QueryOutputProps = {
  className?: string;
  query: QueryExecution;
};

export default function QueryOutput({ className, query }: QueryOutputProps) {
  const [data, setData] = useState<Table | null>(null);
  const { status, error, query: statement, withResultSet } = query;
  console.debug("QueryOutput", { status, error, query });
  useEffect(() => {
    if (query.withResultSet && query.status === "completed" && query.affectedRows > 0) {
      Connections.getQueryExecutionData(query.connectionId, query.id, 0, Math.min(100, query.affectedRows)).then(
        setData,
      );
    }
  }, [query]);

  if (data !== null) {
    console.debug(data);
  }

  return (
    <div className={cx("flex flex-col min-w-full w-full space-y-1", className)}>
      <Code className="w-full max-h-90 overflow-scroll" language="sql" showLineNumbers={false}>
        {statement}
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
