"use strict";
if (typeof FmmlxShapes === "undefined") var FmmlxShapes = {};
if (typeof gMake === "undefined") var gMake = "";
gMake = go.GraphObject.make;


FmmlxShapes.FmmlxProperty = {};


FmmlxShapes.FmmlxProperty._contextMenu = gMake(go.Adornment, "Vertical",
                                               gMake("ContextMenuButton",
                                                     gMake(go.TextBlock, "Raise Property"), {
                                                         click: Controller.FormController.raiseProperty
                                                     }
                                               ),
                                               gMake("ContextMenuButton",
                                                     gMake(go.TextBlock, "Delete Property"), {
                                                         click: Controller.FormController.deleteProperty
                                                     })
);

FmmlxShapes.FmmlxProperty._behaviourBlock = gMake(go.Panel, "Horizontal", {
                                                      minSize: new go.Size(48, 20),
                                                      alignment: go.Spot.Left
                                                  },
                                                  new go.Binding("itemArray", "behaviors"), {
                                                      itemTemplate: gMake(go.Panel, "Auto", {
                                                                              stretch: go.GraphObject.Fill,
                                                                              minSize: new go.Size(10, 20),
                                                                              margin: new go.Margin(0, 2, 0, 0)
                                                                          },
                                                                          gMake(go.Shape, "Rectangle", {
                                                                              fill: "black"
                                                                          }), gMake(go.TextBlock, {
                                                                              stroke: "white",
                                                                              margin: new go.Margin(0, 2, 0, 2),
                                                                              font: "bold 14px monospace"
                                                                          }, new go.Binding("text", "")))
                                                  }
);

FmmlxShapes.FmmlxProperty._nameBlock = gMake(go.TextBlock, new go.Binding("text", "name"), {
    margin: new go.Margin(0, 0, 0, 5)
});

FmmlxShapes.FmmlxProperty._assignmentBlock = gMake(go.TextBlock, {
    margin: new go.Margin(0, 2, 0, 2),
    text: ":",
    font: "bold 14px monospace"
});

FmmlxShapes.FmmlxProperty._typeBlock = gMake(go.TextBlock, new go.Binding("text", "type"), {
    margin: new go.Margin(0, 5, 0, 0)
});

FmmlxShapes.FmmlxProperty.shape = gMake(go.Panel, "Auto", {
                                            stretch: go.GraphObject.Fill,
                                            minSize: new go.Size(150, 20),
                                            contextMenu: FmmlxShapes.FmmlxProperty._contextMenu
                                        },
                                        gMake(go.Shape, "Rectangle", {
                                            fill: "white"
                                        })
    , gMake(go.Panel, "Horizontal", {
                minSize: new go.Size(150, 20),
                alignment: go.Spot.Left
            }, FmmlxShapes.FmmlxProperty._behaviourBlock, FmmlxShapes.FmmlxProperty._nameBlock, FmmlxShapes.FmmlxProperty._assignmentBlock, FmmlxShapes.FmmlxProperty._typeBlock
    )
);


console.log("FMMLxProperties loaded");