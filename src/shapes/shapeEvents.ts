import {IShapeMouseEvent, IShapeMouseEventInit} from '../helpers/Interfaces';
import {Association} from '../models/Association';
import {Inheritance} from '../models/Inheritance';
import {Value} from '../models/Value';
import {Class} from '../models/Class';
import {Property} from '../models/Property';

export enum ShapeEventType {
  'shapeClick' = 'shapeClick',
  'shapeDblclick' = 'shapeDblclick',
  'shapeContextmenu' = 'shapeContextmenu',
}

export class ShapeMouseEvent extends MouseEvent implements IShapeMouseEvent {
  constructor(type: ShapeEventType, init: IShapeMouseEventInit) {
    super(type, init);
    this.shape = init.shape;
  }
  readonly shape: Class | Association | Inheritance | Property | Value;
}
