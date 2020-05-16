import {
  Adornment,
  Binding,
  GraphObject,
  Panel,
  Point,
  Shape,
  Size,
  Spot,
  TextBlock,
  Part,
} from 'gojs/release/go-module';
import {emitAsShapeEvent} from '../helpers/Helper';
import {ShapeEventType} from './shapeEvents';
import {propertyShape} from './PropertyShape';
import {Class} from '../models/Class';

const externalLanguageBlock = GraphObject.make(
  Panel,
  'Auto',
  {
    stretch: GraphObject.Fill,
    alignment: new Spot(0.9, 0),
    maxSize: new Size(45, 18),
  },
  new Binding('visible', '', getIsExternal),
  GraphObject.make(Shape, 'Rectangle', {
    fill: 'orange',
  }),
  GraphObject.make(TextBlock, new Binding('text', 'externalLanguage'), {
    margin: 2,
    wrap: TextBlock.None,
    stroke: 'black',
    overflow: TextBlock.OverflowEllipsis,
    toolTip: GraphObject.make(
      Adornment,
      'Auto',
      GraphObject.make(Shape, {
        fill: '#FFFFCC',
      }),
      GraphObject.make(
        TextBlock,
        {
          margin: 4,
        }
        //new Binding('text', 'externalLanguage')
      )
    ), // end of Adornment
  })
);

const nameBlock = GraphObject.make(
  Panel,
  'Auto',
  {
    stretch: GraphObject.Fill,
    minSize: new Size(100, 20),
  },
  GraphObject.make(Shape, 'Rectangle', new Binding('fill', 'level', getBgColor)),
  GraphObject.make(
    TextBlock,
    new Binding('text', '', getName),
    new Binding('font', 'isAbstract', getFontStyle),
    new Binding('stroke', 'level', getFontColor),
    {
      textAlign: 'center',
      margin: 7,
    }
  )
);

const mainBlock = GraphObject.make(
  Panel,
  'Vertical',
  nameBlock,
  genericBlock('attributes'),
  genericBlock('operations'),
  genericBlock('slotValues'),
  genericBlock('operationValues')
);

function genericBlock(collectionName: string) {
  return GraphObject.make(
    Panel,
    'Auto',
    {
      stretch: GraphObject.Fill,
      minSize: new Size(100, 20),
    },
    GraphObject.make(Shape, 'Rectangle', {
      fill: 'white',
    }),
    GraphObject.make(
      Panel,
      'Vertical',
      {
        margin: 4,
        defaultAlignment: Spot.Left,
      },
      new Binding('itemArray', collectionName),
      {
        itemTemplate: propertyShape,
      }
    )
  );
}

/**
 * Specifies background color based on level
 */
function getBgColor(level: number | null) {
  console.debug('define Bgcolor for level ' + level);
  let color: string;
  switch (level) {
    case 0:
      color = '#E6E6E6';
      break;
    case 1:
      color = '#FFFFFF';
      break;
    case 2:
      color = '#000000';
      break;
    case 3:
      color = '#000074';
      break;
    case 4:
      color = '#910000';
      break;
    case 5:
      color = '#007C36';
      break;
    case null: // "?" <-- its a NaN
      color = '#C45911';
      break;
    default:
      //6+
      color = '#653C7B';
      break;
  }

  return color;
}

/**
 *  Returns the font color based on the classification level of the Fmmlx Class
 *  (black for 0 and 1, white all else)
 */
function getFontColor(level: number | null) {
  return level !== null && level < 2 ? '#000000' : '#FFFFFF';
}

/**
 * Returns font Style for the name block. if class isAbstract then the style is Oblique
 */
function getFontStyle(isAbstract: boolean) {
  let font = `15px 'Roboto', sans-serif`;
  if (isAbstract) {
    font = `Italic ${font}`;
  }
  return font;
}

function getIsExternal(classObj: Class) {
  return classObj.isExternal;
}

/**
 *  Gets the name string to display. that is ^^ META ^^ \n Name
 */
function getName(classObj: Class) {
  return `^${classObj.metaclassName!.toUpperCase()}^\n${classObj.name} (${classObj.level})`;
}

/**
 * The shape
 */
export const classShape = GraphObject.make(
  Part,
  'Spot',
  {
    name: 'classShape',
    click: (event, link) => {
      event.handled = true;
      emitAsShapeEvent(event.event!, link, ShapeEventType.shapeClick);
    },
    doubleClick: (event, link) => {
      event.handled = true;
      emitAsShapeEvent(event.event!, link, ShapeEventType.shapeDblclick);
    },
    contextClick: (event, link) => {
      emitAsShapeEvent(event.event!, link, ShapeEventType.shapeContextmenu);
      event.handled = true;
    },
  },
  new Binding('location', 'location', Point.parse),
  mainBlock,
  externalLanguageBlock
);
