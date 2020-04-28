import {Class} from './Class'; //.js';
import {Property} from './Property'; //.js';
import {Serializable, Comparable} from '../helpers/Helpers'; //.js';

export class Value implements Serializable, Comparable {
  value: string;
  property: Property;
  class: Class;
  tags: Set<string> = new Set();

  constructor(property: Property, value: string, fmmlxClass: Class) {
    this.property = property;
    this.class = fmmlxClass;
    this.value = value;
  }

  get id() {
    return this.property.id + this.class.id;
  }

  get intrinsicness() {
    return this.property.intrinsicness;
  }
  get hasDefinedIntrinsicness() {
    return this.property.intrinsicness !== undefined;
  }

  toJSON(): Object {
    return {
      property: this.property.id,
      value: this.value,
      isValue: true,
      class: this.class.id,
    };
  }

  equals(obj: unknown): boolean {
    if (!obj || typeof obj !== 'object') return false;
    return (
      obj!.constructor === Value &&
      this.class.equals((obj as Value)!.class) &&
      this.property.equals((obj as Value)!.property) &&
      this.value === (obj as Value).value
    );
  }
}
