import { serializable } from "@/utils/serializable";
import { DatasetAttributeFormat } from "@/models/dataset-attribute-format";
import { DatasetAttributeStatistics } from "@/models/dataset-attribute-statistics";
import { immerable } from "immer";

export type AttributeType = (typeof ATTRIBUTE_TYPE)[number];
const ATTRIBUTE_TYPE = [
  "null",
  "boolean",
  "int16",
  "int32",
  "int64",
  "float32",
  "float64",
  "text",
  "date-time",
  "date",
  "time",
  "bytes",
  "array",
  "object",
] as const;

/**
 * Represents an attribute from a dataset.
 *
 * Attributes are the columns/properties of a dataset, they have a name, a type, and a format that defines how the
 * values should be displayed.
 */
export class DatasetAttribute {
  [immerable] = true;

  /**
   * The name of the attribute.
   */
  @serializable("string", { required: true })
  name!: string;

  /**
   * The storage type of the attribute.
   */
  type!: AttributeType;

  /**
   * A list of attributes describing each value of the array if the attribute an array.
   */
  items?: DatasetAttribute[];

  /**
   * The display format of the attribute.
   */
  format?: DatasetAttributeFormat;

  /**
   * Various statistics about the attribute.
   *
   * TBD: (ex: min, max, avg, distinct values, etc.)
   */
  statistics?: DatasetAttributeStatistics;

  constructor(object?: Partial<DatasetAttribute>) {
    Object.assign(this, object);
    this.format = new DatasetAttributeFormat(this.format);
  }
}
