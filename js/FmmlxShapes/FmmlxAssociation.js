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

    static intrinsicnessBlock(intrinsicnessProperty, attrs = null) {
        if (attrs === null) attrs = {};
        attrs = Object.assign(attrs, {
            minSize: new go.Size(10, 15),
        });

        return gMake(go.Panel, "Auto", attrs, gMake(go.Shape, "Rectangle", new go.Binding("fill", "", (assoc) => (assoc.isInstance) ? null : "black"), new go.Binding("stroke", "", (assoc) => (assoc.isInstance) ? null : "black")), gMake(go.TextBlock, new go.Binding("text", intrinsicnessProperty), {
            stroke: "white",
            font: "bold 14px monospace",
            verticalAlignment: go.Spot.Center
        }))
    }


    static get shape() {


        let sourceRole = gMake(go.Panel, "Horizontal", {
                segmentIndex: 0,
                segmentOffset: new go.Point(NaN, -15),
                segmentOrientation: go.Link.OrientUpright
            }, this.intrinsicnessBlock("sourceIntrinsicness", {margin: new go.Margin(0, 3, 0, 15)}),
            gMake(go.TextBlock, new go.Binding("text", "sourceRole")/*, {margin: new go.Margin(0, 5)}*/
            )
        );

        let sourceCardinality = gMake(go.Panel, "Auto", {
            segmentIndex: 0,
            segmentOffset: new go.Point(NaN, 15),
            margin: new go.Margin(0, 3, 0, 15),
            segmentOrientation: go.Link.OrientUpright
        }, gMake(go.TextBlock, new go.Binding("text", "sourceCardinality")));


        let targetRole = gMake(go.Panel, "Horizontal", {
                segmentIndex: -1,
                segmentOffset: new go.Point(NaN, -15),
                segmentOrientation: go.Link.OrientUpright,
            }, this.intrinsicnessBlock("targetIntrinsicness", {margin: new go.Margin(0, 10, 0, 0)}),
            gMake(go.TextBlock, new go.Binding("text", "targetRole") //,  {margin: new go.Margin(0, 5, 0, 0)}
            )
        );

        let targetCardinality = gMake(go.TextBlock, new go.Binding("text", "targetCardinality"), {
            segmentIndex: -1,
            segmentOffset: new go.Point(NaN, 15),
            margin: new go.Margin(0, 15, 0, 0),
            segmentOrientation: go.Link.OrientUpright

        });

        let nameBlock = gMake(go.TextBlock, new go.Binding("text", "name"), {
            segmentOffset: new go.Point(0, -15),
            segmentOrientation: go.Link.OrientUpright
        });


        let referenceBlock = gMake(go.TextBlock, new go.Binding("text", "", this.getReference), {
            segmentOrientation: go.Link.OrientUpright,
            segmentOffset: new go.Point(0, 15),
        });


        return gMake(go.Link, {
                routing: go.Link.Orthogonal,  // may be either Orthogonal or AvoidsNodes
                reshapable: true,
                resegmentable: true,
                curve: go.Link.JumpGap,
                doubleClick: Controller.FormController.displayAssociationForm,
                contextClick: Controller.FormController.displayContextMenu,
            }, gMake(go.Shape, new go.Binding("strokeDashArray", "isInstance", this.strokeType)) // this is the link shape
            , gMake(go.Shape, {
                toArrow: "Standard"
            }), sourceRole, sourceCardinality, nameBlock, referenceBlock, targetRole, targetCardinality
        )
            ;
    }

    static strokeType(instance) {
        return instance ? [1, 3] : null;
    }

}
;


console.log(`FMMLXAssociation Loaded`);