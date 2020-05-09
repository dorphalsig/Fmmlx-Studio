import * as Models from '../models/Models'; //.js';
import {propertyShape} from './PropertyShape'; //.js';
import {displayClassForm, displayContextMenu} from '../controllers/ViewController';
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
} from 'gojs/release/go-module'; //.js';

function externalLanguageBlock() {
  return GraphObject.make(
    Panel,
    'Auto',
    {
      stretch: GraphObject.Fill,
      alignment: new Spot(1, 0),
      maxSize: new Size(54, Infinity),
      name: 'externalLanguageBlock',
    },
    new Binding('visible', '', IsExternal),
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
          },
          new Binding('text', 'externalLanguage')
        )
      ), // end of Adornment
    })
  );
}

function mainBlock() {
  return GraphObject.make(
    Panel,
    'Vertical',
    {name: 'mainBlock'},
    nameBlock(),
    genericBlock('attributes'),
    genericBlock('operations'),
    genericBlock('slotValues'),
    genericBlock('operationValues')
  );
}

function nameBlock() {
  return GraphObject.make(
    Panel,
    'Auto',
    {
      stretch: GraphObject.Fill,
      minSize: new Size(100, 20),
      name: 'nameBlock',
    },
    GraphObject.make(Shape, 'Rectangle', new Binding('fill', 'level', BgColor)),
    GraphObject.make(
      TextBlock,
      new Binding('text', '', MetaclassName),
      new Binding('font', 'isAbstract', FontStyle),
      new Binding('stroke', 'level', FontColor),
      {
        textAlign: 'center',
        margin: 7,
      }
    )
  );
}

function ellipsis() {
  return GraphObject.make(TextBlock, {
    name: 'ellipsis',
    stretch: GraphObject.Fill,
    minSize: new Size(100, 20),
    text: '…',
    font: 'bold 20px monospace',
    textAlign: 'center',
    visible: false,
  });
}

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
        name: collectionName,
        defaultAlignment: Spot.Left,
      },
      GraphObject.make(
        Panel,
        'Vertical',
        {
          name: 'items',
          defaultAlignment: Spot.Left,
          itemTemplate: propertyShape,
        },
        new Binding('itemArray', collectionName)
      ),
      ellipsis()
    )
  );
}

/**
 * Specifies background color based on level
 */
function BgColor(level: string) {
  if (isNaN(+level)) return '#C45911';
  let color;
  switch (isNaN(+level) || +level) {
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
    default:
      //6+
      color = '#653C7B';
  }

  return color;
}

/**
 *  Returns the font color based on the classification level of the Fmmlx Class
 *  (black for 0 and 1, white all else)
 */
function FontColor(level: string) {
  return Number.parseInt(level) < 2 ? '#000000' : '#FFFFFF';
}

/**
 * Returns font Style for the name block. if class isAbstract then the style is Oblique
 */
function FontStyle(isAbstract: boolean) {
  let font = `15px 'Roboto', sans-serif`;
  if (isAbstract) {
    font = `Italic ${font}`;
  }
  return font;
}

function IsExternal(fmmlxClass: Models.Class) {
  return fmmlxClass.isExternal;
}

/**
 *  s the name string to display. that is ^^ META ^^ \n Name
 */
function MetaclassName(fmmlxClass: Models.Class) {
  return `^${fmmlxClass.metaclassName!.toUpperCase()}^\n${fmmlxClass.name} (${fmmlxClass.level})`;
}

export const classShape = GraphObject.make(
  Panel,
  'Spot',
  {
    doubleClick: (event, graphObject) => {
      displayClassForm(graphObject.part!.data);
      event.handled = true;
    },

    contextClick: (event, panel) => {
      const data: Models.Class = (panel as Panel).data;
      displayContextMenu({mouseEvent: event.event as MouseEvent, target1: data});
      event.handled = true;
    },
  },

  new Binding('location', 'location', Point.parse),
  mainBlock(),
  externalLanguageBlock()
) as Panel;
