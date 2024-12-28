import { QueryExecution } from "@/models/queries";
import { TableSettings } from "@/models/user-settings";
import { QUERY_METADATA_SCHEMA } from "@/utils/constants";
import { DataFrame } from "@/utils/dataframe";
import { Schema } from "apache-arrow";
import { useCallback, useMemo } from "react";
import ArrowTableView from "@/components/dataset/arrow-table-view";

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

type QueryTableViewProps = {
  /**
   * Additional CSS class name to apply at the root of the component.
   */
  className?: string;

  /**
   * The query execution to display.
   */
  query: QueryExecution;

  /**
   * The rows of the query execution.
   */
  rows?: DataFrame;

  /**
   * Whether given dataframe is currently fetching rows.
   */
  fetching?: boolean;

  /**
   * The settings of the table view.
   */
  settings: TableSettings;
};

/**
 * A TableView component displaying a query execution.
 */
export default function QueryTableView({ className, query, rows, fetching = false, settings }: QueryTableViewProps) {
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
  return schema ? (
    <ArrowTableView
      className={className}
      settings={settings}
      schema={schema}
      rows={rows}
      fetching={fetching || (query.status === "running" && rows?.getSizeHint() === 0)}
    />
  ) : null;
}
