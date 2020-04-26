import * as Helpers from '../helpers/Helpers';
import {Value} from './Value';
import {Class} from './Class';
import {CustomSet} from '../helpers/Set';
import {Comparable, Serializable} from '../helpers/Interfaces';

export class Property implements Comparable, Serializable {
  #values: Map<Class, Value> = new Map<Class, Value>();
  #classes: Set<Class> = new Set<Class>();
  name: string = '';
  type: string;
  isOperation: boolean;
  behaviors: string[];
  operationBody?: string;
  tags: Set<String> = new Set();
  #id: string;
  #intrinsicness?: number;

  constructor(
    name: string,
    type: string,
    intrinsicness?: number,
    isOperation = false,
    behaviors: string[] = [],
    operationBody?: string,
    tags: string[] = []
  ) {
    this.#id = Helpers.Helper.randomString();
    this.name = name;
    this.type = type;
    this.intrinsicness = intrinsicness;
    this.isOperation = isOperation;
    this.behaviors = behaviors === null ? [] : behaviors;
    this.operationBody = operationBody;
    tags.forEach(tag => this.tags.add(tag));
  }

  get hasDefinedIntrinsicness() {
    return this.#intrinsicness !== undefined;
  }

  get values() {
    return this.#values;
  }

  get classes() {
    return this.#classes;
  }

  get intrinsicness() {
    return this.#intrinsicness;
  }

  set intrinsicness(val: number | undefined) {
    if (val !== undefined && (!Number.isInteger(val) || val! < 0))
      throw new Error('Intrinsicness values can only be posotive integers or');
    this.#intrinsicness = val;
  }

  get id() {
    return this.#id;
  }

  getValue(fmmlxClass: Class): Value | undefined {
    return this.values.get(fmmlxClass);
  }

  /**
   * Inflates a flattened member
   */
  static inflate(flatMember: any) {
    let partial = new Property(
      flatMember.name,
      flatMember.type,
      flatMember.intrinsicness,
      flatMember.isOperation,
      flatMember.behaviors,
      flatMember.operationBody,
      flatMember.tags
    );
    partial.#id = flatMember.id;
    return partial;
  }

  /**
   * Adds an FMMLx Class to the set. Recalculates max intrinsicness
   * @param {Class} fmmlxClass
   */
  addClass(fmmlxClass: Class) {
    this.#classes.add(fmmlxClass);
    return this;
  }

  toJSON(): Object {
    let classes: string[] = [];
    for (let fmmlxClass of this.#classes) {
      classes.push(fmmlxClass.id);
    }
    //this.#classes.forEach(fmmlxClass => classes.push(fmmlxClass.id));
    let values: [string, string][] = [];
    this.#values.forEach((value, fmmlxClass) => values.push([value.value, fmmlxClass.id]));
    return Object.assign(
      {
        id: this.#id,
        classes: classes,
        values: values,
        intrinsicness: this.#intrinsicness,
      },
      this
    );
  }

  static fromObject(obj: any): Property {
    const p = {};
    Object.setPrototypeOf(p, Property.prototype);
    return p as Property;
  }

  /**
   * Removes FMMLx Class from set.
   */
  deleteClass(fmmlxClass: Class): void {
    this.#classes.delete(fmmlxClass);
  }

  deleteValue(value: Value) {
    this.#values.delete(value.class);
    return this;
  }

  equals(obj: any) {
    return (
      this.constructor === Property &&
      this.name === obj.name &&
      this.intrinsicness === obj.intrinsicness
    );
  }

  /**
   * returns the corresponding index of an Attribute or Operation, or null if not found
   * @todo avoid using this
   */
  findIndexForClass(fmmlxClass: Class) {
    let index = Array.from(this.#classes).findIndex(value => value === fmmlxClass);
    return index !== -1 ? index : null;
  }
  toString() {
    return `Property ${this.name} (${this.id})`;
  }
}
