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

    static get shape() {

        let sourceRole = gMake(go.TextBlock, new go.Binding("text", "sourceRole"), {
            margin: new go.Margin(0, 15, 0, 15),
            name: "sourceRole",
            segmentIndex: 0,
            segmentOffset: new go.Point(NaN, -15),
            segmentOrientation: go.Link.OrientUpright,
        });

        let sourceCardinality = gMake(go.TextBlock, new go.Binding("text", "sourceCardinality"), {
            margin: new go.Margin(0, 15, 0, 15),
            name: "sourceCardinality",
            segmentIndex: 0,
            segmentOffset: new go.Point(NaN, 15),
            segmentOrientation: go.Link.OrientUpright,
        });

        let targetRole = gMake(go.TextBlock, new go.Binding("text", "targetRole"), {
            margin: new go.Margin(0, 15, 0, 15),
            name: "targetRole",
            segmentIndex: -1,
            segmentOffset: new go.Point(NaN, -15),
            segmentOrientation: go.Link.OrientUpright,

        });

        let targetCardinality = gMake(go.TextBlock, new go.Binding("text", "targetCardinality"), {
            margin: new go.Margin(0, 15, 0, 15),
            name: "targetCardinality",
            segmentIndex: -1,
            segmentOffset: new go.Point(NaN, 15),
            segmentOrientation: go.Link.OrientUpright,
        });

        let relName = gMake(go.TextBlock, new go.Binding("text", "name"), {
            name: "relationshipName",
            margin: new go.Margin(0, 5, 0, 5)
        });


        let nameBlock = gMake(go.Panel, "Horizontal", {
                name: "nameBlock",
                segmentOrientation: go.Link.OrientUpright,
            },
            this.intrinsicnessBlock("sourceIntrinsicness"), this.arrowBlock("leftArrow"), relName, this.arrowBlock("rightArrow"), this.intrinsicnessBlock("targetIntrinsicness")
        );


        let referenceBlock = gMake(go.TextBlock, new go.Binding("text", "", this.getReference), {
            name: "referenceBlock",
            segmentOffset: new go.Point(0, 15),
            segmentOrientation: go.Link.OrientUpright
        });

        let fmmlxAssociationLink = class extends go.Link {
            computePoints() {
                let result = super.computePoints();
                Helper.Helper.fixLabels(this);
                return result;
            }
        }

        return gMake(fmmlxAssociationLink, {
                routing: go.Link.Orthogonal,  // may be either Orthogonal or AvoidsNodes
                reshapable: true,
                adjusting: go.Link.Stretch,
                curve: go.Link.JumpGap,
                doubleClick: Controller.FormController.displayAssociationForm,
                contextClick: Controller.FormController.displayContextMenu,
            }, gMake(go.Shape, new go.Binding("strokeDashArray", "isInstance", this.strokeType)) // this is the link shape
            , sourceRole, sourceCardinality, nameBlock, referenceBlock, targetRole, targetCardinality
        );
    }

    static arrowBlock(name) {
        let text = (name === "rightArrow") ? " ►" : "◄ ";
        return gMake(go.TextBlock, {text: text, visible: false, name: name})
    }

    static intrinsicnessBlock(intrinsicnessProperty, attrs = null) {
        if (attrs === null) attrs = {};
        attrs = Object.assign(attrs, {
            margin: new go.Margin(0, 10, 0, 10),
            minSize: new go.Size(10, 15),
            name: intrinsicnessProperty,
        });

        return gMake(go.Panel, "Auto", attrs,
            gMake(go.Shape, "Rectangle", new go.Binding("fill", "", (assoc) => (assoc.isInstance) ? null : "black"),
                new go.Binding("stroke", "", (assoc) => (assoc.isInstance) ? null : "black")),
            gMake(go.TextBlock, new go.Binding("text", intrinsicnessProperty), {
                stroke: "white",
                font: "bold 14px monospace",
                verticalAlignment: go.Spot.Center
            }))
    }

    static strokeType(instance) {
        return instance ? [1, 3] : null;
    }

}
;


console.log(`FMMLXAssociation Loaded`);