import { Schema, Table } from "apache-arrow";

export interface DataFrame {
  /**
   * Get an estimate of the number of elements in the dataset.
   */
  getSizeHint(): number;

  /**
   * Get a row in the dataframe.
   */
  get(index: number): Array<unknown>;
}

export class ArrowDataFrame implements DataFrame {
  private _table: Table;

  set table(table: Table) {
    this._table = table;
  }

  get schema(): Schema {
    return this._table?.schema;
  }

  getSizeHint(): number {
    return this._table?.numRows;
  }

  get(index: number): Array<unknown> {
    return this._table?.get(index).toArray();
  }

  constructor(table?: Table) {
    this._table = table;
  }
}
