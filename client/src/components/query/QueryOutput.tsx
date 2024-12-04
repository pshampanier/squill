import cx from "classix";
import { QueryExecution } from "@/models/queries";
import { TableSettings } from "@/models/user-settings";
import { Schema } from "apache-arrow";
import { useCallback, useMemo } from "react";
import { QUERY_METADATA_SCHEMA } from "@/utils/constants";
import { DataFrame } from "@/utils/dataframe";
import Alert from "@/components/core/Alert";
import Code from "@/components/core/Code";
import ArrowTableView from "@/components/dataset/arrow-table-view";

type QueryOutputProps = {
  className?: string;
  query: QueryExecution;
  dataframe?: DataFrame;
  fetching?: boolean;
  settings: TableSettings;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function toJSONSchema(obj: any): any {
  if (Object.prototype.hasOwnProperty.call(obj, "fields") && obj["fields"] instanceof Array) {
    obj.fields = obj.fields.map(toJSONSchema);
  }
  if (Object.prototype.hasOwnProperty.call(obj, "metadata") && obj["metadata"] instanceof Object) {
    const metadata = new Array<Record<string, unknown>>();
    for (const key in obj.metadata) {
      metadata.push({ key, value: obj.metadata[key] });
    }
    obj.metadata = metadata;
  }
  return obj;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function QueryOutput({ className, query, dataframe, fetching = false, settings }: QueryOutputProps) {
  //
  // Props, States & Refs
  //
  const { status, error, query: statement } = query;

  //
  // Logic
  //
  const getSchema = useCallback((query: QueryExecution) => {
    if (!query.metadata) {
      return null;
    } else {
      const json_schema = toJSONSchema(JSON.parse(query.metadata?.[QUERY_METADATA_SCHEMA]));
      const schema = Schema.fromJSON(json_schema);
      return schema;
    }
  }, []);

  // If the schema is known at the time of the creation of the component, we can give it to the TableView as a property,
  // otherwise, we can use the setSchema method to update the schema of the TableView later on.
  const schema = useMemo(() => getSchema(query), [query.metadata]);

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
      {schema && (
        <ArrowTableView
          className="mt-2"
          settings={settings}
          schema={schema}
          rows={dataframe}
          maxRows={20}
          fetching={fetching}
        />
      )}
    </div>
  );
}
