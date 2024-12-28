import cx from "classix";
import { QueryExecution } from "@/models/queries";
import { TableSettings } from "@/models/user-settings";
import { QUERY_METADATA_SCHEMA } from "@/utils/constants";
import { DataFrame } from "@/utils/dataframe";
import Alert from "@/components/core/Alert";
import Code from "@/components/core/Code";
import TableView from "@/components/dataset/table-view";
import QueryTableView from "./QueryTableView";

type QueryOutputProps = {
  className?: string;
  query: QueryExecution;
  dataframe?: DataFrame;
  fetching?: boolean;
  settings: TableSettings;
};

export function QueryOutput({ className, query, dataframe, fetching = false, settings }: QueryOutputProps) {
  //
  // Props, States & Refs
  //
  const { status, error, text: statement } = query;

  //
  // Rendering
  //
  console.debug("QueryOutput", { status, error, query });
  return (
    <div data-component="query-output" className={cx("flex flex-col min-w-full w-full", className)}>
      <Code className="w-full" language="sql" showLineNumbers={false}>
        {statement}
      </Code>
      {status === "failed" && (
        <Alert severity="danger" className="w-full mt-2" border="accent" variant="ghost" size="sm">
          <pre className="text-xs">{error.message}</pre>
        </Alert>
      )}
      <QueryTableView className="mt-2" settings={settings} rows={dataframe} fetching={fetching} query={query} />
    </div>
  );
}

type Layout = {
  padding?: number;
  marginTop?: number;
  marginBottom?: number;
  lineHeight?: number;
};

function calcHeight(layout: Layout, lines: number) {
  return (layout.padding ?? 0) * 2 + (layout.marginTop ?? 0) + (layout.marginBottom ?? 0) + layout.lineHeight * lines;
}

/**
 * Estimate the height of the QueryOutput component for a given query.
 */
QueryOutput.estimateSize = function (query: QueryExecution, maxRows: number, tableSettings: TableSettings) {
  const codeSize = calcHeight({ lineHeight: 18 }, query.text.split("\n").length);
  const alertSize =
    query.status === "failed"
      ? calcHeight({ padding: 8, marginTop: 8, lineHeight: 16 }, query.error.message.split("\n").length)
      : 0;
  const tableViewSize = query.metadata?.[QUERY_METADATA_SCHEMA]
    ? TableView.estimateSize(Math.min(query.storageRows, maxRows), tableSettings) + 8 /* mt-2 */
    : 0;
  return codeSize + alertSize + tableViewSize;
};

export default QueryOutput;
