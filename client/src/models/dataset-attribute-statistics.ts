import { serializable } from "@/utils/serializable";

export class DatasetAttributeStatistics {
  /**
   * The number of null values in the attribute.
   */
  @serializable("integer")
  nullCount?: number;

  /**
   * The number of distinct values in the attribute.
   */
  @serializable("integer")
  distinctCount?: number;

  /**
   * The number of characters in the longest string representation of the values.
   */
  maxCharLength?: number;
}
