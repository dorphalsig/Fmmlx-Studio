'use strict';
import * as Helpers from '../helpers/Helpers';
import {Class} from './Class';
import { Serializable } from '../helpers/Helpers';

export class Inheritance implements Serializable {
  id: any;
  subclass: Class;
  superclass: Class;

  constructor(subclass: Class, superclass: Class) {
    this.id = Helpers.Helper.generateId();
    this.subclass = subclass;
    this.superclass = superclass;
  }

  static get category() {
    return 'fmmlxInheritance';
  }

  get category() {
    return Inheritance.category;
  }

  toJSON() {
    return JSON.stringify({
      subclass: this.from,
      superclass: this.to,
      id: this.id,
      category: this.category,
    });
  }

  get from() {
    return this.subclass.id;
  }

  get to() {
    return this.superclass.id;
  }
}
