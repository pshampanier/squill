import TableView, { TableViewColumn, TableViewProps } from "@/components/dataset/table-view";
import { DataType, Field, Schema } from "apache-arrow";
import {
  BinaryFormat,
  BooleanFormat,
  DateFormat,
  DefaultFormat,
  MacAddressFormat,
  NumberFormat,
  UuidFormat,
} from "@/utils/format";
import {
  QUERY_METADATA_DATASOURCE_TYPE_MACADDR,
  QUERY_METADATA_DATASOURCE_TYPE_MACADDR8,
  QUERY_METADATA_DATASOURCE_TYPE_UUID,
  QUERY_METADATA_FIELD_DATASOURCE_TYPE,
  QUERY_METADATA_FIELD_MAX_LENGTH,
  QUERY_METADATA_FIELD_MAX_VALUE,
} from "@/utils/constants";

export type ArrowTableViewProps = TableViewProps & {
  /**
   * The schema of the dataframe.
   */
  schema?: Schema;
};

const getColumns = (schema: Schema): TableViewColumn[] => {
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
    } else if (DataType.isTimestamp(field.type)) {
      column.align = "right";
      column.format = new DateFormat("en-US", { dateStyle: "short", timeStyle: "short" });
      column.maxLength = column.format.format(new Date()).length;
    } else if (DataType.isBinary(field.type)) {
      switch (field.metadata?.get(QUERY_METADATA_FIELD_DATASOURCE_TYPE)) {
        case QUERY_METADATA_DATASOURCE_TYPE_UUID: {
          //
          // UUIDs
          //
          column.align = "left";
          column.format = new UuidFormat();
          column.maxLength = 36;
          break;
        }
        case QUERY_METADATA_DATASOURCE_TYPE_MACADDR: {
          //
          // MAC addresses
          //
          column.align = "left";
          column.format = new MacAddressFormat();
          column.maxLength = 17;
          break;
        }
        case QUERY_METADATA_DATASOURCE_TYPE_MACADDR8: {
          //
          // MAC addresses 8
          //
          column.align = "left";
          column.format = new MacAddressFormat();
          column.maxLength = 23;
          break;
        }
        default: {
          //
          // Default to binary
          //
          column.align = "left";
          column.format = new BinaryFormat();
          break;
        }
      }
    } else {
      column.align = "left";
      column.format = new DefaultFormat();
    }

    if (column.maxLength === undefined && field.metadata?.has(QUERY_METADATA_FIELD_MAX_LENGTH)) {
      column.maxLength = parseInt(field.metadata.get(QUERY_METADATA_FIELD_MAX_LENGTH));
    }

    return column as TableViewColumn;
  });
};

/**
 * A `TableView` component that displays a dataframe with an Apache Arrow schema.
 */
export default function ArrowTableView(props: ArrowTableViewProps) {
  const { schema, ...rest } = props;
  return <TableView columns={schema ? getColumns(schema) : []} {...rest} />;
}

ArrowTableView.getColumns = getColumns;
