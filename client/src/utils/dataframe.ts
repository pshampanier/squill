import { Schema, Table } from "apache-arrow";

/**
 * Interface for a DataFrame.
 *
 * A DataFrame is a collection of rows, where each row is an array of values.
 */
export interface DataFrame {
  /**
   * Get an estimate of the number of rows in the dataframe.
   */
  getSizeHint(): number;

  /**
   * Get a row from the dataframe.
   *
   * This method should return an array of values, where each value is a column in the dataframe.
   * Returns `null` if the row is not available.
   */
  getRow(index: number): Array<unknown>;

  /**
   * Load the given number of rows starting from the given offset.
   */
  loadRows(offset: number, limit: number): Promise<void>;
}

/**
 * A DataFrame implementation that wraps an Arrow Table.
 */
export class ArrowDataFrame implements DataFrame {
  private _table: Table;

  set table(table: Table) {
    this._table = table;
  }

  get schema(): Schema {
    return this._table?.schema;
  }

  /**
   * Return a zero-copy sub-section of this DataFrame.
   *
   * @param begin The beginning of the specified portion of the Table.
   * @param end The end of the specified portion of the Table. This is exclusive of the element at the index 'end'.
   */
  slice(begin: number, end: number): ArrowDataFrame {
    return new ArrowDataFrame(this._table.slice(begin, end));
  }

  getSizeHint(): number {
    return this._table?.numRows;
  }

  getRow(index: number): Array<unknown> {
    return this._table?.get(index).toArray();
  }

  loadRows(_offset: number, _limit: number): Promise<void> {
    return Promise.resolve();
  }

  constructor(table?: Table) {
    this._table = table;
  }
}
