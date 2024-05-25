import { serializable } from "@/utils/serializable";
import { AttributeFormat } from "@/models/attribute-format";
import { immerable } from "immer";

export type AttributeType = (typeof ATTRIBUTE_TYPE)[number];
const ATTRIBUTE_TYPE = [
  "null",
  "bool",
  "int16",
  "int32",
  "int64",
  "float32",
  "float64",
  "text",
  "datetime",
  "date",
  "time",
  "bytes",
  "array",
] as const;

/**
 * Represents an attribute from a dataset.
 *
 * Attributes are the columns/properties of a dataset, they have a name, a type, and a format that defines how the
 * values should be displayed.
 */
export class Attribute {
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
   * The display format of the attribute.
   */
  format?: AttributeFormat;

  /**
   * The estimated maximum size of the formatted values (in number of characters)
   */
  lengthHint?: number;

  /**
   * Various statistics about the attribute.
   *
   * TBD: (ex: min, max, avg, distinct values, precision (decimals), etc.)
   */
  statistics?: unknown;

  constructor(object?: Partial<Attribute>) {
    Object.assign(this, object);
    this.format = new AttributeFormat(this.format);
  }
}
