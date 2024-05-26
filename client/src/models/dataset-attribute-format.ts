import { serializable } from "@/utils/serializable";

export type DatasetAttributeFormatName = (typeof DATASET_ATTRIBUTE_FORMAT)[number];
const DATASET_ATTRIBUTE_FORMAT = [
  /**
   * Format the attribute as a boolean (true/false).
   */
  "boolean",

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
  "date-time",

  /**
   * Format the attribute as a date (more the time if necessary).
   */
  "date",

  /**
   * Format the attribute as a time (more the date if necessary).
   */
  "time",

  /**
   * Format the attribute as a duration.
   */
  "duration",

  /**
   * Format the attribute as a byte array.
   */
  "bytes",

  /**
   * Format the attribute as currency amount.
   */
  "money",

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

  /**
   * Format the attribute as a color (the value must be either a hex code, color name, or RGB value)
   *
   * @see https://www.w3.org/TR/css-color-3/#svg-color
   */
  "color",
] as const;

/**
 * Represents the format of an attribute.
 *
 * The format defines how the values of the attribute should be displayed.
 */
export class DatasetAttributeFormat {
  /**
   * The name of the format.
   */
  @serializable("string", { required: true })
  name!: DatasetAttributeFormatName;

  constructor(object?: Partial<DatasetAttributeFormat>) {
    Object.assign(this, object);
  }
}
