'use strict';
import * as Models from '../models/Models'; //.js';
import * as go from 'gojs/release/go-module'; //.js';
import {Helper} from '../helpers/Helper'; //.js';
import {displayAssociationForm, displayContextMenu} from '../fmmlxstudio'; //.js';

function fixNameBlock(nameBlock: go.Panel, targetRight = true) {
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
  nameBlock.segmentOffset = new go.Point(0, 15);
}

/**
 * Makes sure that in a link label the intrinsicness boxes are rotated
 * with the link, but are not upside down
 * @param link
 */
function fixLabels(link: go.Link) {
  const nameBlock = link.findObject('nameBlock')! as go.Panel;
  const referenceBlock = link.findObject('referenceBlock')!;
  const sourceRole = link.findObject('sourceRole')!;
  const sourceCardinality = link.findObject('sourceCardinality')!;
  const targetRole = link.findObject('targetRole')!;
  const targetCardinality = link.findObject('targetCardinality')!;
  try {
    let transId = Helper.beginTransaction('Fixing labels...');
    if (link.midAngle !== 180) {
      sourceRole.segmentOffset = new go.Point(NaN, -15);
      nameBlock.segmentOffset = new go.Point(0, -15);
      targetRole.segmentOffset = new go.Point(NaN, -15);
      sourceCardinality.segmentOffset = new go.Point(NaN, 15);
      referenceBlock.segmentOffset = new go.Point(0, 15);
      targetCardinality.segmentOffset = new go.Point(NaN, 15);
      fixNameBlock(nameBlock, true);
      Helper.commitTransaction(transId);
      return;
    }
    sourceRole.segmentOffset = new go.Point(NaN, 15);
    nameBlock.segmentOffset = new go.Point(0, 15);
    targetRole.segmentOffset = new go.Point(NaN, 15);
    sourceCardinality.segmentOffset = new go.Point(NaN, -15);
    referenceBlock.segmentOffset = new go.Point(0, -15);
    targetCardinality.segmentOffset = new go.Point(NaN, -15);
    fixNameBlock(nameBlock, false);
    Helper.commitTransaction(transId);
  } catch (error) {
    Helper.rollbackTransaction();
    throw error;
  }
}

class fmmlxAssociationLink extends go.Link {
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
  return go.GraphObject.make(go.TextBlock, {text: text, visible: false, name: name});
}

function intrinsicnessBlock(intrinsicnessProperty: string, attrs = {}) {
  attrs = {
    ...attrs,
    margin: new go.Margin(0, 10, 0, 10),
    minSize: new go.Size(10, 15),
    name: intrinsicnessProperty,
  };

  return go.GraphObject.make(
    go.Panel,
    'Auto',
    attrs,
    go.GraphObject.make(
      go.Shape,
      'Rectangle',
      new go.Binding('fill', '', assoc => (assoc.isInstance ? null : 'black')),
      new go.Binding('stroke', '', assoc => (assoc.isInstance ? null : 'black'))
    ),
    go.GraphObject.make(go.TextBlock, new go.Binding('text', intrinsicnessProperty), {
      stroke: 'white',
      font: 'bold 14px monospace',
      verticalAlignment: go.Spot.Center,
    })
  );
}

function strokeType(isInstace: boolean) {
  return isInstace ? [1, 3] : null;
}

let sourceRole = go.GraphObject.make(go.TextBlock, new go.Binding('text', 'sourceRole'), {
  margin: new go.Margin(0, 15, 0, 15),
  name: 'sourceRole',
  segmentIndex: 0,
  segmentOffset: new go.Point(NaN, -15),
  segmentOrientation: go.Link.OrientUpright,
});

let sourceCardinality = go.GraphObject.make(
  go.TextBlock,
  new go.Binding('text', 'sourceCardinality'),
  {
    margin: new go.Margin(0, 15, 0, 15),
    name: 'sourceCardinality',
    segmentIndex: 0,
    segmentOffset: new go.Point(NaN, 15),
    segmentOrientation: go.Link.OrientUpright,
  }
);

let targetRole = go.GraphObject.make(go.TextBlock, new go.Binding('text', 'targetRole'), {
  margin: new go.Margin(0, 15, 0, 15),
  name: 'targetRole',
  segmentIndex: -1,
  segmentOffset: new go.Point(NaN, -15),
  segmentOrientation: go.Link.OrientUpright,
});

let targetCardinality = go.GraphObject.make(
  go.TextBlock,
  new go.Binding('text', 'targetCardinality'),
  {
    margin: new go.Margin(0, 15, 0, 15),
    name: 'targetCardinality',
    segmentIndex: -1,
    segmentOffset: new go.Point(NaN, 15),
    segmentOrientation: go.Link.OrientUpright,
  }
);

let relName = go.GraphObject.make(go.TextBlock, new go.Binding('text', 'name'), {
  name: 'relationshipName',
});

let nameBlock = go.GraphObject.make(
  go.Panel,
  'Horizontal',
  {
    name: 'nameBlock',
    segmentOffset: new go.Point(0, -15),
    segmentOrientation: go.Link.OrientUpright,
  },
  intrinsicnessBlock('sourceIntrinsicness'),
  arrowBlock('leftArrow'),
  relName,
  arrowBlock('rightArrow'),
  intrinsicnessBlock('targetIntrinsicness')
);

let referenceBlock = go.GraphObject.make(go.TextBlock, new go.Binding('text', '', referenceText), {
  name: 'referenceBlock',
  segmentOffset: new go.Point(0, 15),
  segmentOrientation: go.Link.OrientUpright,
});

export const associationShape = go.GraphObject.make(
  fmmlxAssociationLink,
  {
    routing: go.Link.Orthogonal, // may be either Orthogonal or AvoidsNodes
    reshapable: true,
    resegmentable: true,
    toSpot: go.Spot.AllSides,
    fromSpot: go.Spot.AllSides,
    curve: go.Link.JumpGap,
    doubleClick: (event, link) => {
      displayAssociationForm((link as fmmlxAssociationLink).data);
      event.handled = true;
    },
    contextClick: (event, link) => {
      displayContextMenu({
        mouseEvent: event.event as MouseEvent,
        target1: (link as fmmlxAssociationLink).data,
      });
      event.handled = true;
    },
  },
  go.GraphObject.make(go.Shape, new go.Binding('strokeDashArray', 'isInstance', strokeType)), // this is the link shape
  sourceRole,
  sourceCardinality,
  nameBlock,
  referenceBlock,
  targetRole,
  targetCardinality
) as fmmlxAssociationLink;
