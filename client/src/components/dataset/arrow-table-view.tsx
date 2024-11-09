import { DataFrame } from "@/utils/dataframe";
import TableView, { TableViewColumn, TableViewComponent } from "@/components/dataset/table-view";
import { useCallback, useEffect, useRef } from "react";
import { DataType, Field, Schema } from "apache-arrow";
import { BooleanFormat, DateFormat, DefaultFormat, NumberFormat } from "@/utils/format";
import { TableSettings } from "@/models/user-settings";
import { QUERY_METADATA_FIELD_MAX_LENGTH, QUERY_METADATA_FIELD_MAX_VALUE } from "@/utils/constants";

export interface ArrowTableViewComponent {
  /**
   * Change the schema of the table.
   */
  setSchema(schema: Schema): void;

  /**
   * Change the settings of the table.
   */
  setSettings(settings: TableSettings): void;

  /**
   * Change the rows of the table.
   */
  setRows(rows: DataFrame): void;

  /**
   * Indicate that the dataframe to be displayed is fetching some data.
   */
  setFetching(fetching: boolean): void;
}

export type ArrowTableViewProps = {
  /**
   * Additional classes to apply to the top element rendered by the component.
   */
  className?: string;

  /**
   * The schema of the dataframe.
   */
  schema?: Schema;

  /**
   * The rows to display.
   */
  rows?: DataFrame;

  /**
   * Indicate if the table is fetching some data.
   */
  fetching?: boolean;

  /**
   * The settings to apply to the table.
   */
  settings?: TableSettings;

  onMount?: (component: ArrowTableViewComponent) => void;
};

/**
 * A `TableView` component that displays a dataframe with an Apache Arrow schema.
 */
export default function ArrowTableView({
  className,
  schema,
  rows,
  settings,
  onMount,
  fetching = false,
}: ArrowTableViewProps) {
  const tableViewComponent = useRef<TableViewComponent>(null);

  const getColumns = useCallback((schema: Schema) => {
    return schema.fields.map((field: Field, index) => {
      const column: Partial<TableViewColumn> = {
        name: field.name,
        title: field.name,
        dataIndex: index,
      };

      if (DataType.isBool(field.type)) {
        column.align = "center";
        column.maxLength = 1;
        column.format = new BooleanFormat();
      } else if (DataType.isFloat(field.type)) {
        column.align = "right";
        column.format = new NumberFormat("en-US", { maximumFractionDigits: 2 });
        const maxValue = field.metadata?.get(QUERY_METADATA_FIELD_MAX_VALUE)
          ? parseFloat(field.metadata?.get(QUERY_METADATA_FIELD_MAX_VALUE))
          : Number.MAX_VALUE;
        column.maxLength = column.format.format(maxValue).length;
      } else if (DataType.isInt(field.type)) {
        column.align = "right";
        column.format = new NumberFormat("en-US", { maximumFractionDigits: 0 });
        const maxValue = field.metadata?.get(QUERY_METADATA_FIELD_MAX_VALUE) ?? Number.MAX_SAFE_INTEGER;
        column.maxLength = column.format.format(maxValue).length;
      } else if (DataType.isDate(field.type)) {
        column.align = "right";
        column.format = new DateFormat("en-US", { dateStyle: "short" });
        column.maxLength = column.format.format(new Date()).length;
      } else {
        column.align = "left";
        column.format = new DefaultFormat();
      }

      if (column.maxLength === undefined && field.metadata?.has(QUERY_METADATA_FIELD_MAX_LENGTH)) {
        column.maxLength = parseInt(field.metadata.get(QUERY_METADATA_FIELD_MAX_LENGTH));
      }

      return column as TableViewColumn;
    });
  }, []);

  useEffect(() => {
    onMount?.({
      // FIXME: if the settings changes, getColumn will not be accurate because of its dependency to `settings.maxLength`.
      setSchema: (schema) => tableViewComponent.current?.setColumns(getColumns(schema)),
      setRows: (rows) => tableViewComponent.current?.setRows(rows),
      setSettings: (settings) => tableViewComponent.current?.setSettings(settings),
      setFetching: (fetching) => tableViewComponent.current?.setFetching(fetching),
    });
  }, []);

  const handleOnMount = useCallback((component: TableViewComponent) => {
    tableViewComponent.current = component;
  }, []);

  return (
    <TableView
      className={className}
      fetching={fetching}
      columns={schema ? getColumns(schema) : []}
      rows={rows}
      settings={settings}
      onMount={handleOnMount}
    />
  );
}
