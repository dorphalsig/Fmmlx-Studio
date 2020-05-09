import {Class} from '../models/Class';
import {Association} from '../models/Association';
import {Inheritance} from '../models/Inheritance';
import {Property} from '../models/Property';
import {Value} from '../models/Value';

export interface Comparable {
  equals(obj: any): boolean;
  //  hash: string;
}

export interface Serializable {
  toJSON(): Object;
}

export interface IShapeMouseEvent extends MouseEvent {
  shape?: Class | Association | Inheritance | Property | Value;
}
