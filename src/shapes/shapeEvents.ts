import {Association, Class, Inheritance, Property, Value} from '../models/Models';
import {IShapeMouseEvent} from '../helpers/Interfaces';

export enum ShapeEventType {
  'shapeClick' = 'shapeClick',
  'shapeDblclick' = 'shapeDblclick',
  'shapeContextmenu' = 'shapeContextmenu',
}

export class ShapeMouseEvent extends MouseEvent implements IShapeMouseEvent {
  shape?: Class | Association | Inheritance | Property | Value;
  type!: ShapeEventType;
}
