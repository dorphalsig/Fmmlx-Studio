'use strict';
import * as Models from '../models/Models'; //.js';
import {Helper} from '../helpers/Helpers'; //.js';
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
import {ShapeEventType} from './shapeEvents';
import {reEmitAsShapeEvent} from '../helpers/Helper';

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

class fmmlxAssociationLink extends Link {
  computePoints() {
    let result = super.computePoints();
    fixLabels(this);
    return result;
  }
}

/**
 * Defines the text for the reference block (lower middle segment of the
 */
function referenceText(fmmlxAssociation: Models.Association) {
  let text = '';
  if (fmmlxAssociation.isInstance) text = `^ ${fmmlxAssociation.metaAssociation!.name} ^`;
  if (fmmlxAssociation.isRefinement) text = `( ${fmmlxAssociation.primitive!.name} )`;
  return text;
}

function arrowBlock(name: string) {
  let text = name === 'rightArrow' ? ' ►' : '◄ ';
  return GraphObject.make(TextBlock, {text: text, visible: false, name: name});
}

function intrinsicnessBlock(intrinsicnessProperty: string, attrs = {}) {
  attrs = {
    ...attrs,
    margin: new Margin(0, 10, 0, 10),
    minSize: new Size(10, 15),
    name: intrinsicnessProperty,
  };

  return GraphObject.make(
    Panel,
    'Auto',
    attrs,
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

function strokeType(isInstace: boolean) {
  return isInstace ? [1, 3] : null;
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

let referenceBlock = GraphObject.make(TextBlock, new Binding('text', '', referenceText), {
  name: 'referenceBlock',
  segmentOffset: new Point(0, 15),
  segmentOrientation: Link.OrientUpright,
});

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
      const eventType = ShapeEventType.shapeClick;
      reEmitAsShapeEvent(event.event! as InputEvent, link, eventType);
      event.handled = true;
    },
    doubleClick: (event, link) => {
      const eventType = ShapeEventType.shapeDblclick;
      reEmitAsShapeEvent(event.event! as InputEvent, link, eventType);
      event.handled = true;

      //displayAssociationForm((link as fmmlxAssociationLink).data);
      event.handled = true;
    },
    contextClick: (event, link) => {
      const eventType = ShapeEventType.shapeContextmenu;
      reEmitAsShapeEvent(event.event! as InputEvent, link, eventType);
      event.handled = true;

      /*displayContextMenu({
        mouseEvent: event.event as MouseEvent,
        target1: (link as fmmlxAssociationLink).data,
      });*/
    },
  },
  GraphObject.make(Shape, new Binding('strokeDashArray', 'isInstance', strokeType)), // this is the link shape
  sourceRole,
  sourceCardinality,
  nameBlock,
  referenceBlock,
  targetRole,
  targetCardinality
) as fmmlxAssociationLink;
