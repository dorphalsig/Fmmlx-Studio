"use strict";
if (typeof FmmlxShapes === "undefined") {
    window.FmmlxShapes = {};
}
if (typeof gMake === "undefined") {
    window.gMake = "";
}
gMake = go.GraphObject.make;


FmmlxShapes.FmmlxProperty = class {
    static get ellipsis() {
        return gMake(go.TextBlock, {
            stretch: GraphObject.Fill,
            minSize: new go.Size(100, 20),
            text: "…",
            font: "bold 14px monospace",
            textAlign: "center"
        });
    }

    static get shape() {
        let _behaviourBlock = gMake(go.Panel, "Horizontal", {
            minSize: new go.Size(48, 20), alignment: go.Spot.Left, margin: 0,
        }, new go.Binding("itemArray", "", prop => (!prop.isValue) ? [prop.intrinsicness].concat(prop.behaviors) : []), {
            itemTemplate: gMake(go.Panel, "Auto", {
                stretch: go.GraphObject.Fill, minSize: new go.Size(10, 20), margin: new go.Margin(0, 2, 0, 0),
            }, gMake(go.Shape, "Rectangle", {
                fill: "black",
            }), gMake(go.TextBlock, {
                stroke: "white", margin: new go.Margin(0, 2, 0, 2), font: "bold 14px monospace",
            }, new go.Binding("text", ""))),
        });

        let _nameBlock = gMake(go.TextBlock, new go.Binding("text", "name"), {
            margin: new go.Margin(0, 0, 0, 2),
        });

        let _assignmentBlock = gMake(go.TextBlock, new go.Binding("text", "", (prop) => {
            return (Boolean(prop.isValue)) ? (prop.isOperation ? "→" : "=") : ":";
        }), {margin: new go.Margin(0, 2, 0, 2), font: "bold 14px monospace",});

        let _typeBlock = gMake(go.TextBlock, new go.Binding("text", "", (prop) => (prop.isValue) ? prop.value : prop.type), {
            margin: new go.Margin(0, 5, 0, 0),
        });

        return gMake(go.Panel, "Horizontal", /*new go.Binding("name", "id"),*/ {
            contextClick: Controller.FormController.displayContextMenu,
            doubleClick: Controller.FormController.displayMemberForm,
            minSize: new go.Size(100, 20), padding: new go.Margin(0, 2, 2, 2),
        }, _behaviourBlock, _nameBlock, _assignmentBlock, _typeBlock);
    }
};


console.log("FMMLxProperties loaded");