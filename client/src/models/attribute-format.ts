import { serializable } from "@/utils/serializable";

export type AttributeFormatName = (typeof ATTRIBUTE_FORMAT)[number];
const ATTRIBUTE_FORMAT = [
  /**
   * Apply the default format for the attribute type.
   */
  "default",

  /**
   * Format the attribute as a boolean (true/false).
   */
  "bool",

  /**
   * Format the attribute as a signed integer.
   */
  "int",

  /**
   * Format the attribute as a floating point number.
   */
  "float",

  /**
   * Format the attribute as a string.
   */
  "text",

  /**
   * Format the attribute as a date and time.
   */
  "datetime",

  /**
   * Format the attribute as a date (more the time if necessary).
   */
  "date",

  /**
   * Format the attribute as a time (more the date if necessary).
   */
  "time",

  /**
   * Format the attribute as a byte array.
   */
  "bytes",

  /**
   * Format the attribute a currency value.
   */
  "currency",

  /**
   * Format the attribute as a percentage value.
   */
  "hex",

  /**
   * Format the attribute as a percentage.
   */
  "percent",

  /**
   * Format the attribute as a graph, the value to be formatted must be an array.
   */
  "graph",

  /**
   * Format the attribute as a measure, the type of the measure must be specified (e.g. digitalStorage, duration, etc.)
   */
  "measure",
] as const;

/**
 * Represents the format of an attribute.
 *
 * The format defines how the values of the attribute should be displayed.
 */
export class AttributeFormat {
  /**
   * The name of the format.
   */
  @serializable("string", { required: true })
  name: AttributeFormatName = "default";

  constructor(object?: Partial<AttributeFormat>) {
    Object.assign(this, object);
  }
}
