import {GraphObject, Link, Shape} from 'gojs/release/go-module';
import {emitAsShapeEvent} from '../helpers/Helper';
import {ShapeEventType} from './shapeEvents'; //.js';

const arrowHead = GraphObject.make(
  Shape, // the arrowhead
  {
    toArrow: 'Triangle',
    fill: 'white',
  }
);

export const inheritanceShape: Link = GraphObject.make(
  Link,
  {
    routing: Link.Orthogonal, // may be either Orthogonal or AvoidsNodes
    reshapable: true,
    resegmentable: true,
    curve: Link.JumpGap,
    click: (event, propertyShape: GraphObject) => {
      emitAsShapeEvent(event.event!, propertyShape, ShapeEventType.shapeClick);
      event.handled = true;
    },

    doubleClick: (event, propertyShape: GraphObject) => {
      emitAsShapeEvent(event.event!, propertyShape, ShapeEventType.shapeDblclick);
      event.handled = true;
    },
    contextClick: (event, propertyShape) => {
      emitAsShapeEvent(event.event!, propertyShape, ShapeEventType.shapeContextmenu);
      event.handled = true;
    },
  },
  GraphObject.make(Shape), // the link shape
  arrowHead
) as Link;
