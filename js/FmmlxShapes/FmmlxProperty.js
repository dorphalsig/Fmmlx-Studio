"use strict";
if (typeof FmmlxShapes === "undefined") window.FmmlxShapes = {};
if (typeof gMake === "undefined") window.gMake = "";
gMake = go.GraphObject.make;


FmmlxShapes.FmmlxProperty = {};

FmmlxShapes.FmmlxProperty._behaviourBlock = gMake(go.Panel, "Horizontal", {
    minSize: new go.Size(48, 20), alignment: go.Spot.Left, margin: 0,
}, new go.Binding("itemArray", "", prop =>

    (!prop.isValue) ? [prop.intrinsicness].concat(prop.behaviors) : []), {
    itemTemplate: gMake(go.Panel, "Auto", {
        stretch: go.GraphObject.Fill, minSize: new go.Size(10, 20), margin: new go.Margin(0, 2, 0, 0),
    }, gMake(go.Shape, "Rectangle", {
        fill: "black",
    }), gMake(go.TextBlock, {
        stroke: "white", margin: new go.Margin(0, 2, 0, 2), font: "bold 14px monospace",
    }, new go.Binding("text", ""))),
});

FmmlxShapes.FmmlxProperty._nameBlock = gMake(go.TextBlock, new go.Binding("text", "name"), {
    margin: new go.Margin(0, 0, 0, 2),
});

FmmlxShapes.FmmlxProperty._assignmentBlock = gMake(go.TextBlock, new go.Binding("text", "", (prop) => {
    return (Boolean(prop.isValue)) ? (prop.isOperation ? "→" : "=" ) : ":";
}), {margin: new go.Margin(0, 2, 0, 2), font: "bold 14px monospace",});

FmmlxShapes.FmmlxProperty._typeBlock = gMake(go.TextBlock, new go.Binding("text", "", (prop) => (prop.isValue) ? prop.value : prop.type), {
    margin: new go.Margin(0, 5, 0, 0),
});

FmmlxShapes.FmmlxProperty.shape = gMake(go.Panel, "Auto", {
    stretch: go.GraphObject.Fill, minSize: new go.Size(100, 20), name: "member", alignment: go.Spot.Left, contextClick: Controller.FormController.showHideContextMenu, doubleClick: Controller.FormController.displayPropertyForm,
}, gMake(go.Panel, "Horizontal", {
    name: "FMMLxProperty", minSize: new go.Size(100, 20), padding: new go.Margin(0, 2, 2, 2),

}, FmmlxShapes.FmmlxProperty._behaviourBlock, FmmlxShapes.FmmlxProperty._nameBlock, FmmlxShapes.FmmlxProperty._assignmentBlock, FmmlxShapes.FmmlxProperty._typeBlock));


console.log("FMMLxProperties loaded");