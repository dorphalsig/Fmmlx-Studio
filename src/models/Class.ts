import * as Helpers from '../helpers/Helpers'; //.js';
import {Association} from './Association'; //.js';
import {Property} from './Property'; //.js';
import {Value} from './Value'; //.js';

export class Class implements Helpers.Comparable, Helpers.Serializable {
  distanceFromRoot = 0;
  name = '';
  superclass?: Class;
  lastChangeId = '';
  externalLanguage?: string;
  externalMetaclassName?: string;
  isAbstract = false;
  tags: Set<string>;
  id: string;
  #subclasses: Set<Class> = new Set();
  #instances: Set<Class> = new Set();
  #associations: Set<Association> = new Set();
  #attributes: Set<Property> = new Set();
  #operations: Set<Property> = new Set();
  #slotValues: Set<Value> = new Set();
  #operationValues: Set<Value> = new Set();
  #level?: number;
  #metaclass?: Class;

  constructor(
    name: string,
    level?: number,
    isAbstract = false,
    externalLanguage?: string,
    externalMetaclass?: string,
    tags: string[] = []
  ) {
    //  Object.setPrototypeOf(this, null);
    this.level = level;
    this.name = name;
    //@todo check if this helps build the json file, if so migrate the whole thing to use indexeddb
    this.externalLanguage = externalLanguage;
    this.externalMetaclassName = externalMetaclass;
    this.isAbstract = isAbstract;
    this.tags = new Set(tags);
    this.id = Helpers.Helper.randomString();
  }

  get subclasses() {
    return this.#subclasses;
  }

  get instances() {
    return this.#instances;
  }

  get level() {
    return this.#level;
  }

  get descendants() {
    return [...this.#subclasses, ...this.#instances];
  }

  set level(level: number | undefined) {
    if (level !== undefined && (!Number.isInteger(level) || level! < 0))
      throw new Error(`Erroneous level ${level} for class ${this.name}`);
    this.#level = level;
  }

  get metaclass() {
    return this.#metaclass;
  }

  set metaclass(metaclass: Class | undefined) {
    //@todo check this
    //possible bug? shouldn't the distanceFromRoot be 1+ that of the metaclass?

    this.distanceFromRoot = metaclass === undefined ? 0 : metaclass.distanceFromRoot + 1;
    this.#metaclass = metaclass;
  }

  static category = 'FmmlxClass';

  /**
   * Returns a partially inflated copy of a flattened class
   */
  static inflate(flatClass: any) {
    let partial = new Class(
      flatClass.name,
      flatClass.level,
      flatClass.isAbstract,
      flatClass.externalLanguage,
      flatClass.externalMetaclass,
      flatClass.tags
    );
    partial.id = flatClass.id;
    return partial;
  }

  get isExternal() {
    return this.externalLanguage === undefined;
  }

  get metaclassName() {
    if (this.isExternal) return this.externalMetaclassName;
    if (this.metaclass === undefined) return 'Metaclass';
    return this.metaclass.name;
  }

  get values() {
    return new Set([...this.#operationValues, ...this.#slotValues]);
  }
  get members() {
    return [...this.#attributes, ...this.#operations];
  }

  equals(obj: Class) {
    let equals = this.name === obj.name && this.level === obj.level;
    if (this.isExternal) {
      equals =
        equals &&
        this.externalLanguage === obj.externalLanguage &&
        this.externalMetaclassName === obj.externalMetaclassName;
    } else if (this.metaclass !== undefined && obj.metaclass !== undefined) {
      equals = equals && this.metaclass.id === obj.metaclass.id;
    }

    return equals;
  }

  addInstance(instance: Class) {
    this.#instances.add(instance);
  }

  addSubclass(subclass: Class) {
    this.#subclasses.add(subclass);
  }
  addAssociation(association: Association) {
    this.#associations.add(association);
  }

  deflate() {
    return this.toJSON();
  }

  /**
   * Returns a flattened copy of the object
   */
  toJSON(): Object {
    return Object.assign(
      {
        metaclass: this.#metaclass !== undefined ? this.#metaclass.id : null,
        superclass: this.superclass !== undefined ? this.superclass.id : null,
        subclasses: Array.from(this.#subclasses).map(item => item.id),
        instances: Array.from(this.#instances).map(item => item.id),
        associations: Array.from(this.#associations).map(item => item.id),
        attributes: Array.from(this.#attributes).map(item => item.id),
        operations: Array.from(this.#operations).map(item => item.id),
        slotValues: Array.from(this.#slotValues).map(item => item.id),
        operationValues: Array.from(this.#operationValues).map(item => item.id),
      },
      this
    );
  }

  /**
   * Returns the corresponding index of an Attribute or Operation or Value, or null if not found
   * This function is SLOW, CustomSet is SLOOW
   */
  /*findIndexForMember(member: Property | Value): null | number {
    let array = this.findCorrespondingCollection(member) as Set<Property | Value>;
    let index = array.findIndex(member);
    return index !== -1 ? index : null;
  }*/

  findCorrespondingCollectionName(member: Property | Value): string {
    if (Object.getPrototypeOf(member) === Property)
      return (member as Property).isOperation ? 'operations' : 'attributes';
    return (member as Value).property.isOperation ? 'operationValues' : 'slotValues';
  }

  get hasDefinedLevel(): boolean {
    return this.#level !== undefined;
  }

  //@todo make these properties public
  get attributes() {
    return this.#attributes;
  }

  get operations() {
    return this.#operations;
  }

  /**
   *  returns the appropriate array for a member or value. Ie. if its an attribute returns a ref to the attribute array.
   *  if returnName is true, returns the name as a String.
   */
  findCorrespondingCollection(member: Property | Value): Set<Property | Value> {
    if (member.constructor === Property) {
      return (member as Property).isOperation ? this.#operations : this.#attributes;
    }
    return (member as Value).property.isOperation ? this.#operationValues : this.#slotValues;
  }

  /**
   * Returns the attribute/operation/*value with the specified id
   */
  findMemberById(memberId: string): Property | Value {
    let members = [
      ...this.#attributes,
      ...this.#slotValues,
      ...this.#operationValues,
      ...this.#operations,
    ];
    return members.filter(member => member.id === memberId)[0];
  }

  removeAssociation(association: Association): void {
    this.#associations.delete(association);
  }

  removeInstance(instance: Class) {
    this.#instances.delete(instance);
  }

  removeSubclass(subclass: Class) {
    this.#subclasses.delete(subclass);
  }

  toString() {
    return `${this.name} (${this.id})`;
  }
}
