import {Value} from './Value';
import {Property} from './Property';
import {Association} from './Association';
import * as Helpers from '../helpers/Helpers';

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
  #subclasses: Helpers.CustomSet<Class> = new Helpers.CustomSet();
  #instances: Helpers.CustomSet<Class> = new Helpers.CustomSet();
  #associations: Helpers.CustomSet<Association> = new Helpers.CustomSet();
  #attributes: Helpers.CustomSet<Property> = new Helpers.CustomSet();
  #operations: Helpers.CustomSet<Property> = new Helpers.CustomSet();
  #slotValues: Helpers.CustomSet<Value> = new Helpers.CustomSet();
  #operationValues: Helpers.CustomSet<Value> = new Helpers.CustomSet();
  #level?: number;
  #metaclass?: Class;

  constructor(
    name:string,
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
    return [...this.#operationValues, ...this.#slotValues];
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
  toJSON(): string {
    const clone = Object.assign(
      {
        metaclass: this.#metaclass !== undefined ? this.#metaclass.id : null,
        superclass: this.superclass !== undefined ? this.superclass.id : null,
        subclasses: this.#subclasses.toArray().map(item => item.id),
        instances: this.#instances.toArray().map(item => item.id),
        associations: this.#associations.toArray().map(item => item.id),
        attributes: this.#attributes.toArray().map(item => item.id),
        operations: this.#operations.toArray().map(item => item.id),
        slotValues: this.#slotValues.toArray().map(item => item.id),
        operationValues: this.#operationValues.toArray().map(item => item.id),
      },
      this
    );
    return JSON.stringify(clone);
  }

  /**
   * Returns the corresponding index of an Attribute or Operation or Value, or null if not found
   * This function is SLOW, CustomSet is SLOOW
   */
  findIndexForMember(member: Property | Value): null | number {
    let array = this.findCorrespondingArray(member) as Helpers.CustomSet<Property | Value>;
    let index = array.findIndex(member);
    return index !== -1 ? index : null;
  }

  findCorrespondingArrayName(member: Property | Value): string {
    if (Object.getPrototypeOf(member) === Property)
      return (member as Property).isOperation ? 'operations' : 'attributes';
    return (member as Value).property.isOperation ? 'operationValues' : 'slotValues';
  }

  hasDefinedLevel(): boolean {
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
  findCorrespondingArray(member: Property | Value): Helpers.CustomSet<Property | Value> {
    if (Object.getPrototypeOf(member) === Property)
      return (member as Property).isOperation ? this.#operations : this.#attributes;
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

  /**
   * Determines if a Member or its corresponding value exist
   */
  hasMember(member: Property): boolean {
    let index = this.findIndexForMember(member);
    if (index !== null) {
      return true;
    }

    if (member.constructor === Property) {
      return this.findValueFromProperty(member) !== null;
    }

    return false;
  }

  /**
   * Finds the respective <Value> for <Member> if it exists. Returns null otherwise
   */
  /*findValueFromProperty(property: Property): null | Value {
    return property.getValue(this);
  }*/

  /**
   * Checks whether a class is a descendant of another class
   */
  isDescendantOf(fmmlxClass: Class): boolean {
    let isDescendant = false;
    while (!isDescendant) {
      if (this.#metaclass !== undefined) {
        isDescendant = this.#metaclass.equals(fmmlxClass)
          ? true
          : this.#metaclass.isDescendantOf(fmmlxClass);
      }

      if (!isDescendant && this.superclass !== undefined) {
        isDescendant = this.superclass.equals(fmmlxClass)
          ? true
          : this.superclass.isDescendantOf(fmmlxClass);
      }
    }
    return isDescendant;
  }

  removeAssociation(association: Association): void {
    return this.#associations.remove(association);
  }

  removeInstance(instance: Class) {
    this.#instances.remove(instance);
  }

  removeSubclass(subclass: Class) {
    this.#subclasses.remove(subclass);
  }

  toString(){
    return `${this.name} (${this.id})`
  }
}
