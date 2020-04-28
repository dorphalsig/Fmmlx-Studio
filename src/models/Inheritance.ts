'use strict';
import {Class} from './Class'; //.js';
import {Helper, Serializable} from '../helpers/Helpers'; //.js';

export class Inheritance implements Serializable {
  id: any;
  subclass: Class;
  superclass: Class;

  constructor(subclass: Class, superclass: Class) {
    this.id = Helper.randomString();
    this.subclass = subclass;
    this.superclass = superclass;
  }

  static readonly category = 'fmmlxInheritance';

  toJSON() {
    return JSON.stringify({
      subclass: this.from,
      superclass: this.to,
      id: this.id,
      category: Inheritance.category,
    });
  }

  get from() {
    return this.subclass.id;
  }

  get to() {
    return this.superclass.id;
  }
}
