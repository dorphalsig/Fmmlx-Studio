import {
  Binding,
  GraphObject,
  Panel,
  Shape,
  Size,
  Spot,
  TextBlock,
  Margin,
} from 'gojs/release/go-module';
import {emitAsShapeEvent} from '../helpers/Helper';
import {ShapeEventType} from './shapeEvents';

const behaviourBlock = GraphObject.make(
  Panel,
  'Horizontal',
  {
    minSize: new Size(48, 20),
    alignment: Spot.Left,
    margin: 0,
  },
  new Binding('itemArray', '', prop =>
    !prop.isValue ? [prop.intrinsicness].concat(prop.behaviors) : []
  ),
  {
    itemTemplate: GraphObject.make(
      Panel,
      'Auto',
      {
        stretch: GraphObject.Fill,
        minSize: new Size(10, 20),
        margin: new Margin(0, 2, 0, 0),
      },
      GraphObject.make(Shape, 'Rectangle', {
        fill: 'black',
      }),
      GraphObject.make(
        TextBlock,
        {
          stroke: 'white',
          margin: new Margin(0, 2, 0, 2),
          font: 'bold 14px monospace',
        },
        new Binding('text', '')
      )
    ),
  }
);

const nameBlock = GraphObject.make(TextBlock, new Binding('text', 'name'), {
  margin: new Margin(0, 0, 0, 2),
});

const assignmentBlock = GraphObject.make(
  TextBlock,
  new Binding('text', '', prop => {
    return Boolean(prop.isValue) ? (prop.isOperation ? '→' : '=') : ':';
  }),
  {margin: new Margin(0, 2, 0, 2), font: 'bold 14px monospace'}
);

const typeBlock = GraphObject.make(
  TextBlock,
  new Binding('text', '', prop => (prop.isValue ? prop.value : prop.type)),
  {
    margin: new Margin(0, 5, 0, 0),
  }
);

export const propertyShape = GraphObject.make(
  Panel,
  'Horizontal',
  /*new Binding("name", "id"),*/ {
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
    minSize: new Size(100, 20),
    padding: new Margin(0, 2, 2, 2),
  },
  behaviourBlock,
  nameBlock,
  assignmentBlock,
  typeBlock
);
