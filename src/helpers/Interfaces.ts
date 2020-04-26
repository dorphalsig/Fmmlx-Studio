export interface Comparable {
  equals(obj: any): boolean;
  //  hash: string;
}

export interface Serializable {
  toJSON(): Object;
}
