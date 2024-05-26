import { DatasetAttribute } from "@/models/dataset-attribute";

export class DatasetSchema extends DatasetAttribute {
  constructor(object?: Partial<DatasetSchema>) {
    super(object);
  }
}
