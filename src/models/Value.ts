import {Class} from './Class';
import {Property} from './Property';
import { Serializable, Comparable } from '../helpers/Helpers';

export class Value implements Serializable,Comparable{
  value: string;
  #property: Property;
  #class: Class;

  constructor(property: Property, value: string, fmmlxClass: Class) {
    this.#property = property;
    this.#class = fmmlxClass;
    this.value = value;
  }

  get class(){
    return this.#class
  }

  get property() {
    return this.#property;
  }

  get id() {
    return this.#property.id + this.#class.id;
  }

  get tags() {
    return this.#property.tags;
  }

  get intrinsicness() {
    return this.#property.intrinsicness;
  }

  toJSON() {
    const flat = {
      property: this.#property.id,
      value: this.value,
      isValue: true,
      class: this.#class.id,
    };
    return JSON.stringify(flat);
  }

  equals(obj: unknown): boolean {
    if (!obj || typeof obj !== 'object') return false;
    return (
      obj!.constructor === Value &&
      this.#class.equals((obj as Value)!.#class) &&
      this.#property.equals((obj as Value)!.#property)
    );
  }
}
