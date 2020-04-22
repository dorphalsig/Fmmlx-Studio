'use strict';
import * as Models from '../models/Models';
import * as go from 'gojs';
import * as Helpers from '../helpers/Helpers';

export class AssociationShape {
  /**
   * Defines the text for the reference block (lower middle segment of the
   */
  static getReference(fmmlxAssociation: Models.Association) {
    let text = '';
    if (fmmlxAssociation.isInstance) text = `^ ${fmmlxAssociation.metaAssociation!.name} ^`;
    if (fmmlxAssociation.isRefinement) text = `( ${fmmlxAssociation.primitive!.name} )`;
    return text;
  }

  static arrowBlock(name: string) {
    let text = name === 'rightArrow' ? ' ►' : '◄ ';
    return go.GraphObject.make(go.TextBlock, {text: text, visible: false, name: name});
  }

  static intrinsicnessBlock(intrinsicnessProperty: string, attrs = {}) {
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

  static strokeType(isInstace: boolean) {
    return isInstace ? [1, 3] : null;
  }

  //@todo add callbacks for clicks and doubleclicks
  static get shape() {
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
      this.intrinsicnessBlock('sourceIntrinsicness'),
      this.arrowBlock('leftArrow'),
      relName,
      this.arrowBlock('rightArrow'),
      this.intrinsicnessBlock('targetIntrinsicness')
    );

    let referenceBlock = go.GraphObject.make(
      go.TextBlock,
      new go.Binding('text', '', this.getReference),
      {
        name: 'referenceBlock',
        segmentOffset: new go.Point(0, 15),
        segmentOrientation: go.Link.OrientUpright,
      }
    );

    let fmmlxAssociationLink = class extends go.Link {
      computePoints() {
        let result = super.computePoints();
        Helpers.Helper.fixLabels(this);
        return result;
      }
    };

    return go.GraphObject.make(
      fmmlxAssociationLink,
      {
        routing: go.Link.Orthogonal, // may be either Orthogonal or AvoidsNodes
        reshapable: true,
        resegmentable: true,
        toSpot: go.Spot.AllSides,
        fromSpot: go.Spot.AllSides,
        curve: go.Link.JumpGap,
        //doubleClick: Controller.FormController.displayAssociationForm,
        //contextClick: Controller.FormController.displayContextMenu,
      },
      go.GraphObject.make(
        go.Shape,
        new go.Binding('strokeDashArray', 'isInstance', this.strokeType)
      ), // this is the link shape
      sourceRole,
      sourceCardinality,
      nameBlock,
      referenceBlock,
      targetRole,
      targetCardinality
    );
  }
}

console.debug(`FMMLXAssociation Loaded`);
