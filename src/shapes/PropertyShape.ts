import * as go from 'gojs';

const behaviourBlockTemplate = go.GraphObject.make(
  go.Panel,
  'Auto',
  {
    stretch: go.GraphObject.Fill,
    minSize: new go.Size(10, 20),
    margin: new go.Margin(0, 2, 0, 0),
  },
  go.GraphObject.make(go.Shape, 'Rectangle', {
    fill: 'black',
  }),
  go.GraphObject.make(
    go.TextBlock,
    {
      stroke: 'white',
      margin: new go.Margin(0, 2, 0, 2),
      font: 'bold 14px monospace',
    },
    new go.Binding('text', '')
  )
);

const behaviourBlock = go.GraphObject.make(
  go.Panel,
  'Horizontal',
  {
    minSize: new go.Size(48, 20),
    alignment: go.Spot.Left,
    margin: 0,
  },
  new go.Binding('itemArray', '', prop =>
    !prop.isValue ? [prop.intrinsicness].concat(prop.behaviors) : []
  ),
  {
    itemTemplate: behaviourBlockTemplate,
  }
);

const nameBlock = go.GraphObject.make(go.TextBlock, new go.Binding('text', 'name'), {
  margin: new go.Margin(0, 0, 0, 2),
});

const assignmentBlock = go.GraphObject.make(
  go.TextBlock,
  new go.Binding('text', '', prop => {
    return Boolean(prop.isValue) ? (prop.isOperation ? '→' : '=') : ':';
  }),
  {margin: new go.Margin(0, 2, 0, 2), font: 'bold 14px monospace'}
);

const typeBlock = go.GraphObject.make(
  go.TextBlock,
  new go.Binding('text', '', prop => (prop.isValue ? prop.value : prop.type)),
  {
    margin: new go.Margin(0, 5, 0, 0),
  }
);

//@todo handle click events properly
export const propertyShape = go.GraphObject.make(
  go.Panel,
  'Horizontal',
  /*new gojs.Binding("name", "id"),*/ {
    //contextClick: Controller.FormController.displayContextMenu,
    //doubleClick: Controller.FormController.displayMemberForm,
    minSize: new go.Size(100, 20),
    padding: new go.Margin(0, 2, 2, 2),
  },
  behaviourBlock,
  nameBlock,
  assignmentBlock,
  typeBlock
) as go.Panel;

