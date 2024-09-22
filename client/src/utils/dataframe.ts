import { DataframeSchema, DataframeAttribute, DataframeAttributeFormat } from "@/models/dataframes";

export interface DataFrame<E> {
  /**
   * Get a unique identifier for the dataset.
   */
  getId(): string;

  /**
   * Get the schema of the elements (E) stored in the dataset.
   */
  getSchema(): DataframeSchema;

  /**
   * Get an estimate of the number of elements in the dataset.
   *
   * @returns undefined if the size is unknown.
   */
  getSizeHint(): number;

  /**
   * Get a fragment of the dataset.
   *
   * @param offset Indicates how many elements to skip from the beginning of the dataset.
   * @param limit The maximum number of elements. If the limit exceed the maximum number the server is allowed to return
   *              then this limit will be ignored and the server limit will be used instead.
   *
   * @returns A promise that resolves to a tuple containing the fragment and a boolean indicating if there are no more
   * elements available. The boolean can be used to determine if the fragment is the last one in the dataset, `true`
   * means the fragment is the last one, `false` means there are more elements available.
   */
  getSlice(offset: number, limit: number): Promise<DataFrameSlice<E>>;
}

/**
 * A slice of the dataframe.
 */
export type DataFrameSlice<E> = {
  /**
   * The elements in the slice.
   */
  data: Array<E>;

  /**
   * The offset of the first element in the slide, i.e. where the slice starts in the whole dataframe.
   */
  offset: number;
};

/**
 * A dataset that has all data given at construction time.
 */
export class MemoryDataFrame<E> implements DataFrame<E> {
  private id!: string;
  private schema!: DataframeSchema;
  private data!: Array<E>;

  constructor(id: string, schema: DataframeSchema, data: Array<E>) {
    this.id = id;
    this.schema = schema;
    this.data = data;
  }

  getId(): string {
    return this.id;
  }

  getSchema(): DataframeSchema {
    return this.schema;
  }

  getSizeHint(): number {
    return this.data.length;
  }

  async getSlice(offset: number, limit: number): Promise<DataFrameSlice<E>> {
    console.debug("MemoryDataFrame.getSlice", offset, limit);
    return {
      data: this.data.slice(offset, offset + limit),
      offset: offset,
    };
  }
}

export type TableDataFrame = MemoryDataFrame<string[]>;

/**
 * Factory for creating table dataframes.
 *
 * The table dataframes are created by fetching CSV files from the server. This code is not expected to be performant
 * of reliable, it is only used for displaying datasets that well known and tested at development time.
 */
export class TableDataFrameFactory {
  /**
   * Fetch a table dataframe from a CSV file.
   *
   * @param url The URL of the CSV file to fetch.
   * @returns A promise that resolves to a table dataframe.
   */
  static async fetch(url: string): Promise<TableDataFrame> {
    return fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load data (url=${url}, status=${response.status})`);
      }
      return response.text().then((text) => {
        const lines = text.split("\n");
        const schema = new DataframeSchema({
          id: url,
          attributes: lines[0].split(",").map((column) => {
            return new DataframeAttribute({
              name: column,
              type: "text",
              format: new DataframeAttributeFormat({
                name: "text",
              }),
            });
          }),
        });
        const data = lines
          .slice(1)
          .filter((line) => line.length)
          .map((line) => {
            return line.match(/(".*?"|[^",\s]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g).map((value) => {
              if (value.startsWith('"') && value.endsWith('"')) {
                return value.slice(1, -1); // Remove surrounding quotes
              }
              return value;
            });
          });
        return new MemoryDataFrame(url, schema, data);
      });
    });
  }
}
