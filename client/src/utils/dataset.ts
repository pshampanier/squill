export type Collection<E> = Array<E>;

export interface Dataset<E> {
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
  getFragment(offset: number, limit: number): Promise<[Collection<E>, boolean]>;
}

export class MemoryDataset<E> implements Dataset<E> {
  private data: Collection<E>;

  constructor(data: Collection<E>) {
    this.data = data;
  }

  async getFragment(offset: number, limit: number): Promise<[Collection<E>, boolean]> {
    return [this.data.slice(offset, offset + limit), offset + limit >= this.data.length];
  }
}
