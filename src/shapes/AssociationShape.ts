import {
  Binding,
  GraphObject,
  Link,
  Margin,
  Panel,
  Point,
  Shape,
  Size,
  Spot,
  TextBlock,
} from 'gojs/release/go-module';
import {Association} from '../models/Association';
import {emitAsShapeEvent} from '../helpers/Helper';
import {ShapeEventType} from './shapeEvents';
import {Helper} from '../helpers/Helpers';

/**
 * Defines the text for the reference block (lower middle segment of the
 */
function getReference(fmmlxAssociation: Association) {
  let text = '';
  if (fmmlxAssociation.isInstance) text = `^ ${fmmlxAssociation.metaAssociation!.name} ^`;
  if (fmmlxAssociation.isRefinement) text = `( ${fmmlxAssociation.primitive!.name} )`;
  return text;
}

let sourceRole = GraphObject.make(TextBlock, new Binding('text', 'sourceRole'), {
  margin: new Margin(0, 15, 0, 15),
  name: 'sourceRole',
  segmentIndex: 0,
  segmentOffset: new Point(NaN, -15),
  segmentOrientation: Link.OrientUpright,
});

let sourceCardinality = GraphObject.make(TextBlock, new Binding('text', 'sourceCardinality'), {
  margin: new Margin(0, 15, 0, 15),
  name: 'sourceCardinality',
  segmentIndex: 0,
  segmentOffset: new Point(NaN, 15),
  segmentOrientation: Link.OrientUpright,
});

let targetRole = GraphObject.make(TextBlock, new Binding('text', 'targetRole'), {
  margin: new Margin(0, 15, 0, 15),
  name: 'targetRole',
  segmentIndex: -1,
  segmentOffset: new Point(NaN, -15),
  segmentOrientation: Link.OrientUpright,
});

let targetCardinality = GraphObject.make(TextBlock, new Binding('text', 'targetCardinality'), {
  margin: new Margin(0, 15, 0, 15),
  name: 'targetCardinality',
  segmentIndex: -1,
  segmentOffset: new Point(NaN, 15),
  segmentOrientation: Link.OrientUpright,
});

let relName = GraphObject.make(TextBlock, new Binding('text', 'name'), {
  name: 'relationshipName',
});

let nameBlock = GraphObject.make(
  Panel,
  'Horizontal',
  {
    name: 'nameBlock',
    segmentOffset: new Point(0, -15),
    segmentOrientation: Link.OrientUpright,
  },
  intrinsicnessBlock('sourceIntrinsicness'),
  arrowBlock('leftArrow'),
  relName,
  arrowBlock('rightArrow'),
  intrinsicnessBlock('targetIntrinsicness')
);

let referenceBlock = GraphObject.make(TextBlock, new Binding('text', '', getReference), {
  name: 'referenceBlock',
  segmentOffset: new Point(0, 15),
  segmentOrientation: Link.OrientUpright,
});

/**
 * Makes sure that in a link label the intrinsicness boxes are rotated
 * with the link, but are not upside down
 * @param link
 */
function fixLabels(link: Link) {
  const nameBlock = link.findObject('nameBlock')! as Panel;
  const referenceBlock = link.findObject('referenceBlock')!;
  const sourceRole = link.findObject('sourceRole')!;
  const sourceCardinality = link.findObject('sourceCardinality')!;
  const targetRole = link.findObject('targetRole')!;
  const targetCardinality = link.findObject('targetCardinality')!;
  try {
    let transId = Helper.beginTransaction('Fixing labels...');
    if (link.midAngle !== 180) {
      sourceRole.segmentOffset = new Point(NaN, -15);
      nameBlock.segmentOffset = new Point(0, -15);
      targetRole.segmentOffset = new Point(NaN, -15);
      sourceCardinality.segmentOffset = new Point(NaN, 15);
      referenceBlock.segmentOffset = new Point(0, 15);
      targetCardinality.segmentOffset = new Point(NaN, 15);
      fixNameBlock(nameBlock, true);
      Helper.commitTransaction(transId);
      return;
    }
    sourceRole.segmentOffset = new Point(NaN, 15);
    nameBlock.segmentOffset = new Point(0, 15);
    targetRole.segmentOffset = new Point(NaN, 15);
    sourceCardinality.segmentOffset = new Point(NaN, -15);
    referenceBlock.segmentOffset = new Point(0, -15);
    targetCardinality.segmentOffset = new Point(NaN, -15);
    fixNameBlock(nameBlock, false);
    Helper.commitTransaction(transId);
  } catch (error) {
    Helper.rollbackTransaction();
    throw error;
  }
}
function fixNameBlock(nameBlock: Panel, targetRight = true) {
  let sourceIntrinsicness = nameBlock.findObject('sourceIntrinsicness')!;
  let targetIntrinsicness = nameBlock.findObject('targetIntrinsicness')!;
  nameBlock.remove(sourceIntrinsicness);
  nameBlock.remove(targetIntrinsicness);

  if (targetRight) {
    nameBlock.insertAt(0, sourceIntrinsicness);
    nameBlock.add(targetIntrinsicness);
    nameBlock.findObject('leftArrow')!.visible = false;
    nameBlock.findObject('rightArrow')!.visible = true;
    return;
  }

  nameBlock.insertAt(0, targetIntrinsicness);
  nameBlock.add(sourceIntrinsicness);
  nameBlock.findObject('leftArrow')!.visible = true;
  nameBlock.findObject('rightArrow')!.visible = false;
  nameBlock.segmentOffset = new Point(0, 15);
}
class fmmlxAssociationLink extends Link {
  computePoints() {
    let result = super.computePoints();
    fixLabels(this);
    return result;
  }
}

export const associationShape = GraphObject.make(
  fmmlxAssociationLink,
  {
    routing: Link.Orthogonal, // may be either Orthogonal or AvoidsNodes
    reshapable: true,
    resegmentable: true,
    toSpot: Spot.AllSides,
    fromSpot: Spot.AllSides,
    curve: Link.JumpGap,
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
  GraphObject.make(Shape, new Binding('strokeDashArray', 'isInstance', strokeType)), // this is the link shape
  sourceRole,
  sourceCardinality,
  nameBlock,
  referenceBlock,
  targetRole,
  targetCardinality
);

function arrowBlock(name: string) {
  let text = name === 'rightArrow' ? ' ►' : '◄ ';
  return GraphObject.make(TextBlock, {text: text, visible: false, name: name});
}

function intrinsicnessBlock(intrinsicnessProperty: string) {
  return GraphObject.make(
    Panel,
    'Auto',
    {
      margin: new Margin(0, 10, 0, 10),
      minSize: new Size(10, 15),
      name: intrinsicnessProperty,
    },
    GraphObject.make(
      Shape,
      'Rectangle',
      new Binding('fill', '', assoc => (assoc.isInstance ? null : 'black')),
      new Binding('stroke', '', assoc => (assoc.isInstance ? null : 'black'))
    ),
    GraphObject.make(TextBlock, new Binding('text', intrinsicnessProperty), {
      stroke: 'white',
      font: 'bold 14px monospace',
      verticalAlignment: Spot.Center,
    })
  );
}

function strokeType(instance: boolean) {
  return instance ? [1, 3] : null;
}
