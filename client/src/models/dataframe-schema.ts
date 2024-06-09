import { DatasetAttribute } from "@/models/dataset-attribute";

export class DataFrameSchema extends DatasetAttribute {
  /**
   * The unique identifier of the schema.
   */
  id!: string;

  constructor(object?: Partial<DataFrameSchema>) {
    super(object);
    this.id = object?.id;
  }
}
