/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 ********************************************************************/
import { formatRegExp, serializable } from "@/utils/serializable";
import { immerable } from "immer";


/**
 * The density of a table.
 */
export const TABLE_DENSITY_VALUES = ["compact", "comfortable"] as const;
export type TableDensity = (typeof TABLE_DENSITY_VALUES)[number];

/**
 * The dividers between columns & rows in a table.
 */
export const TABLE_DIVIDERS_VALUES = ["none", "rows", "grid"] as const;
export type TableDividers = (typeof TABLE_DIVIDERS_VALUES)[number];

/**
 * The overscan of a table.
 */
export const TABLE_OVERSCAN_VALUES = ["small", "medium", "large"] as const;
export type TableOverscan = (typeof TABLE_OVERSCAN_VALUES)[number];

/**
 * The visual representation of null values.
 */
export const NULL_VALUES_VALUES = ["null_lowercase", "null_uppercase", "empty", "dash", "not_available_lowercase", "not_available_uppercase"] as const;
export type NullValues = (typeof NULL_VALUES_VALUES)[number];


/**
 * The settings of a table displaying a dataframe.
 **/
export class TableSettings {
  [immerable] = true;
  
  /**
   * The density of the table.
   **/
  @serializable("string", { format: formatRegExp(TABLE_DENSITY_VALUES), required: true })
  density!: TableDensity;
  
  /**
   * The dividers between columns & rows in the table.
   **/
  @serializable("string", { format: formatRegExp(TABLE_DIVIDERS_VALUES), required: true })
  dividers!: TableDividers;
  
  /**
   * The maximum length of a column in the table.
   **/
  @serializable("integer", { required: true, min: 0, snakeCase: "property" })
  maxLength!: number;
  
  /**
   * The visual representation of null values.
   **/
  @serializable("string", { format: formatRegExp(NULL_VALUES_VALUES), required: true, snakeCase: "property" })
  nullValues!: NullValues;
  
  /**
   * The overscan of the table.
   **/
  @serializable("string", { format: formatRegExp(TABLE_OVERSCAN_VALUES), required: true })
  overscan!: TableOverscan;
  
  /**
   * Show the row numbers in the table.
   **/
  @serializable("boolean", { required: true, snakeCase: "property" })
  showRowNumbers!: boolean;
  
  constructor(object?: Partial<TableSettings>) {
    Object.assign(this, object);
  }
}