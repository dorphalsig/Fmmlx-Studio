import * as Helpers from '../helpers/Helpers';
import {Value} from './Value';
import {Class} from './Class';
import {CustomSet} from '../helpers/Set';
import {Comparable, Serializable} from '../helpers/Interfaces';

export class Property implements Comparable, Serializable {
  #values: CustomSet<Value> = new CustomSet<Value>();
  #classes: CustomSet<Class> = new CustomSet<Class>();
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

  get hasDefinedIntrinsicness(){
    return this.#intrinsicness !== undefined
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
  static get isValue() {
    return false;
  }

  /**
   * If the property has a value with a specific
   * @param fmmlxClass
   */
  getValue(fmmlxClass: Class) {
    for (const value of this.#values) {
      if (value.class.equals(fmmlxClass)) return value;
    }
    return null;
  }

  /**
   * Inflates a flattened member
   * @param flatMember
   * @return {Property}
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

  /**
   * Returns the value instance if there exists for a specified FmmlxClass, if it does not exist, it returns undefined
   */
  getValueByClass(fmmlxClass: Class) {
    let [found] = this.#values.toArray().filter(val => val.class.equals(fmmlxClass));
    return found;
  }

  toJSON(): string {
    let classes: string[] = [];
    this.#classes.toArray().forEach(fmmlxClass => classes.push(fmmlxClass.id));
    let values: string[] = [];
    this.#values.toArray().forEach(value => values.push(value.id));

    const serializable = Object.assign(
      {
        id: this.#id,
        classes: classes,
        values: values,
        isValue: Property.isValue,
        intrinsicness: this.#intrinsicness,
      },
      this
    );
    return JSON.stringify(serializable);
  }

  /**
   * Removes FMMLx Class from set.
   */
  deleteClass(fmmlxClass: Class) {
    this.#classes.remove(fmmlxClass);
    return this;
  }

  deleteValue(value: Value) {
    this.#values.remove(value);
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
   */
  findIndexForClass(fmmlxClass: Class) {
    let index = this.#classes.findIndex(fmmlxClass);
    return index !== -1 ? index : null;
  }
  toString() {
    return `Property ${this.name} (${this.id})`;
  }
}
