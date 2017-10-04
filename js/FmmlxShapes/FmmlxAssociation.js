"use strict";
if (typeof FmmlxShapes === "undefined") {
    window.FmmlxShapes = {};
}
if (typeof gMake === "undefined") {
    window.gMake = go.GraphObject.make;
}


FmmlxShapes.FmmlxAssociation = class {

    /**
     * Defines the text for the reference block (lower middle segment of the
     * @param {Model.FmmlxAssociation}fmmlxAssociation
     */
    static getReference(fmmlxAssociation) {
        let text = "";
        if (fmmlxAssociation.isInstance) text = `^ ${fmmlxAssociation.metaAssociation.name} ^`;
        if (fmmlxAssociation.isRefinement) text = `( ${fmmlxAssociation.primitive.name} )`;
        return text;
    }

    static intrinsicnessBlock(intrinsicnessProperty) {
        return gMake(go.Panel, "Auto", {minSize: new go.Size(10, 15), margin: new go.Margin(0, 2, 0, 0)}, gMake(go.Shape, "Rectangle", new go.Binding("fill", "", (assoc) => (assoc.isInstance) ? null : "black"), new go.Binding("stroke", "", (assoc) => (assoc.isInstance) ? null : "black")), gMake(go.TextBlock, new go.Binding("text", intrinsicnessProperty), {stroke: "white", margin: new go.Margin(0, 2, 0, 2), font: "bold 14px monospace", verticalAlignment: go.Spot.Center}))
    }


    static get shape() {
        let sourceRole = gMake(go.TextBlock, new go.Binding("text", "sourceRole"), {
            segmentIndex: 0, segmentOffset: new go.Point(NaN, -10), segmentOrientation: go.Link.OrientUpright, margin: new go.Margin(0, 5)
        });

        let sourceCardinality = gMake(go.TextBlock, new go.Binding("text", "sourceCardinality"), {
            segmentIndex: 0, segmentOffset: new go.Point(NaN, 10), segmentOrientation: go.Link.OrientUpright, margin: new go.Margin(0, 5)
        });

        let targetRole = gMake(go.TextBlock, new go.Binding("text", "targetRole"), {
            segmentIndex: -1, segmentOffset: new go.Point(NaN, -10), segmentOrientation: go.Link.OrientUpright, margin: new go.Margin(0, 5)
        });

        let targetCardinality = gMake(go.TextBlock, new go.Binding("text", "targetCardinality"), {
            segmentIndex: -1, segmentOffset: new go.Point(NaN, 10), segmentOrientation: go.Link.OrientUpright, margin: new go.Margin(0, 5)
        });

        let nameBlock = gMake(go.Panel, "Horizontal", {
            segmentOffset: new go.Point(0, 10), segmentOrientation: go.Link.OrientUpright
        }, this.intrinsicnessBlock("sourceIntrinsicness"), gMake(go.TextBlock, new go.Binding("text", "name"), {
            margin: new go.Margin(0, 2, 0, 2)
        }), this.intrinsicnessBlock("targetIntrinsicness"));


        let referenceBlock = gMake(go.TextBlock, new go.Binding("text", "", this.getReference), {segmentOffset: new go.Point(0, -10), segmentOrientation: go.Link.OrientUpright});


        return gMake(go.Link, {
                routing: go.Link.Orthogonal,  // may be either Orthogonal or AvoidsNodes
                reshapable: true, resegmentable: true,
                curve: go.Link.JumpGap, doubleClick: Controller.FormController.displayAssociationForm, contextClick: Controller.FormController.displayContextMenu,
            }, gMake(go.Shape, new go.Binding("strokeDashArray", "isInstance", this.strokeType)) // this is the link shape
            , gMake(go.Shape, {
                toArrow: "Standard"
            }), sourceRole, sourceCardinality, nameBlock, referenceBlock, targetRole, targetCardinality);
    }

    static strokeType(instance) {
        return instance ? [1, 3] : null;
    }

};


console.log(`FMMLXAssociation Loaded`);