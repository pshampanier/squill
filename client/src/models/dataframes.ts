/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 ********************************************************************/
import { formatRegExp, serializable } from "@/utils/serializable";


/**
 * The type of a dataset attribute.
 */
export const DATAFRAME_ATTRIBUTE_TYPE_VALUES = ["none", "boolean", "int16", "int32", "int64", "float32", "float64", "text", "datetime", "date", "time", "bytes", "array", "object"] as const;
export type DataframeAttributeType = (typeof DATAFRAME_ATTRIBUTE_TYPE_VALUES)[number];

/**
 * The display format of a dataframe attribute.
 */
export const DATAFRAME_ATTRIBUTE_FORMAT_NAME_VALUES = ["boolean", "int", "float", "text", "datetime", "date", "time", "duration", "bytes", "money", "hex", "percent", "graph", "measure", "color"] as const;
export type DataframeAttributeFormatName = (typeof DATAFRAME_ATTRIBUTE_FORMAT_NAME_VALUES)[number];


/**
 * The display format of a dataframe attribute.
 **/
export class DataframeAttributeFormat {
  
  /**
   * The name of the format.
   **/
  @serializable("string", { format: formatRegExp(DATAFRAME_ATTRIBUTE_FORMAT_NAME_VALUES), required: true })
  name!: DataframeAttributeFormatName;
  
  constructor(object?: Partial<DataframeAttributeFormat>) {
    Object.assign(this, object);
  }
}


/**
 * Represents an attribute from a dataframe.
   * 
   * Attributes are the columns/properties of a dataframe, they have a name, a type, and a format that defines how 
   * the values should be displayed.
   * 
 **/
export class DataframeAttribute {
  
  /**
   * A list of attributes describing each value if the current attribute is an object.
   **/
  @serializable("array", { items: { type: "object", options: { factory: DataframeAttribute } } })
  attributes?: DataframeAttribute[];
  
  /**
   * The display format of the attribute.
   **/
  @serializable("object", { factory: DataframeAttributeFormat })
  format?: DataframeAttributeFormat;
  
  /**
   * An attribute describing the items if the current attribute is an array.
   **/
  @serializable("object", { factory: DataframeAttribute })
  items?: DataframeAttribute;
  
  /**
   * The name of the attribute.
   **/
  @serializable("string", { required: true })
  name!: string;
  
  /**
   * The data storage type of the attribute.
   **/
  @serializable("string", { format: formatRegExp(DATAFRAME_ATTRIBUTE_TYPE_VALUES), required: true })
  type!: DataframeAttributeType;
  
  constructor(object?: Partial<DataframeAttribute>) {
    Object.assign(this, object);
    this.attributes = (object?.attributes || []).map((item) => new DataframeAttribute(item));
    this.format = object?.format && new DataframeAttributeFormat(object.format);
    this.items = object?.items && new DataframeAttribute(object.items);
  }
}


/**
 * The schema of a dataframe.
 **/
export class DataframeSchema {
  
  /**
   * The attributes of the dataframe.
   **/
  @serializable("array", { required: true, items: { type: "object", options: { factory: DataframeAttribute } } })
  attributes!: DataframeAttribute[];
  
  /**
   * The unique identifier of the dataframe schema.
   **/
  @serializable("string", { format: "uuid" })
  id?: string;
  
  /**
   * The version of the dataframe schema.
   **/
  @serializable("integer", { min: 1 })
  version?: number;
  
  constructor(object?: Partial<DataframeSchema>) {
    Object.assign(this, object);
    this.attributes = (object?.attributes || []).map((item) => new DataframeAttribute(item));
  }
}