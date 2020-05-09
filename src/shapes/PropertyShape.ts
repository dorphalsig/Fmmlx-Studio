import * as go from 'gojs/release/go-module'; //.js';
import {displayContextMenu, displayMemberForm} from '../controllers/ViewController';
import {Property, Value} from '../models/Models';
import {
  Binding,
  GraphObject,
  Margin,
  Panel,
  Shape,
  Size,
  Spot,
  TextBlock,
} from 'gojs/release/go-module';
import {ShapeEventType} from './shapeEvents'; //.js';

const behaviourBlockTemplate = GraphObject.make(
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
);

function createBehaviourArray(member: Property | Value) {
  if (member.constructor === Value) return [];
  const intrinsicness = member.intrinsicness == null ? '?' : member.intrinsicness.toString();
  const obtainable = (member as Property).behaviors.obtainable ? 'O' : '';
  const derivable = (member as Property).behaviors.derivable ? 'D' : '';
  const simulation = (member as Property).behaviors.simulation ? 'S' : '';
  return [intrinsicness, obtainable, derivable, simulation];
}

const behaviourBlock = GraphObject.make(
  Panel,
  'Horizontal',
  {
    minSize: new Size(48, 20),
    alignment: Spot.Left,
    margin: 0,
  },
  new Binding('itemArray', '', createBehaviourArray),
  {
    itemTemplate: behaviourBlockTemplate,
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
  {margin: new Margin(0, 5, 0, 0)}
);

//@todo handle click events properly
export const propertyShape: Panel = GraphObject.make(
  Panel,
  'Horizontal',
  /*new gojs.Binding("name", "id"),*/ {
    doubleClick: (event, panel) => {
      //edit
      //const click = new CustomEvent(ShapeEventType.shapeDblclick, {});
      event.handled = true;
    },
    contextClick: (event, panel) => {
      displayContextMenu({
        mouseEvent: event.event as MouseEvent,
        target1: (panel as Panel).data,
        target2: (panel as Panel).part!.data,
      });
      event.handled = true;
    },
    minSize: new Size(100, 20),
    padding: new Margin(0, 2, 2, 2),
  },
  behaviourBlock,
  nameBlock,
  assignmentBlock,
  typeBlock
) as Panel;
