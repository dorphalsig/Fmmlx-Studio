//@todo the underlying array should be observed to check for duplicates on change, because gojs does stuff with it
import {Comparable} from './Interfaces'; //.js';
export class CustomSet<T> {
  #data: (T & Comparable)[] = [];

  *[Symbol.iterator]() {
    yield* this.#data;
  }

  constructor(data?: (T & Comparable) | (T & Comparable)[]) {
    if (!data) return;
    data = Array.isArray(data) ? data : [data];
    this.add(data);
  }

  get size() {
    return this.#data.length;
  }

  /**
   * Adds an item or array to the collection if it doesnt exist. (Comparing it with all others (using obj.equals()) )
   * Because the items contained are to be compared based on their properties, there is no way to use a calculated hash.
   */
  add(newData: (T & Comparable) | (T & Comparable)[]) {
    if (newData === null) throw new Error('This implementation cannot hold null values');
    newData = Array.isArray(newData) ? newData : [newData];
    let data = this.#data;

    for (const newItem of newData) {
      let dupe = false;
      for (const existing of data) {
        if (existing.equals(newItem)) {
          dupe = true;
          break;
        }
      }
      if (!dupe) data.push(newItem);
    }
    this.#data = data;
  }

  remove(remove: any) {
    this.#data = this.#data.filter(data => !remove.equals(data));
  }
  get length() {
    return this.#data.length;
  }

  has(value: any) {
    return this.#data.filter(data => data.equals(value)).length > 0;
  }

  findIndex(value: any) {
    for (let i = 0; i < this.#data.length; i++) {
      if (this.#data[i].equals(value)) return i;
    }
    return -1;
  }

  toArray() {
    return this.#data;
  }
}
export class NotComparableError extends Error {
  constructor() {
    super('Failed to add items: One of the items is not comparable');
  }
}
