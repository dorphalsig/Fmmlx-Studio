"use strict";
(typeof window.FmmlxShapes === "undefined") ? window.FmmlxShapes = {} : null;
(typeof gMake === "undefined") ? window.gMake = go.GraphObject.make : null;

FmmlxShapes.FmmlxInheritance = class {
    static get shape() {
        return gMake(go.Link, {
                routing: go.Link.Orthogonal,  // may be either Orthogonal or AvoidsNodes
                reshapable: true,
                resegmentable: true,
                relinkableFrom: true,
                relinkableTo: true,
                adjusting: go.Link.Stretch,
                curve: go.Link.JumpGap, contextClick: Controller.FormController.displayContextMenu
            }, gMake(go.Shape),  // the link shape
            gMake(go.Shape,   // the arrowhead
                {
                    toArrow: "Triangle", fill: "white"
                }));
    }
};