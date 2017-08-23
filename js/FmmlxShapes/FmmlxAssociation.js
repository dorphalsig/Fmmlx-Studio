"use strict";

if (typeof FmmlxShapes === "undefined") var FmmlxShapes = {};
if (typeof gMake === "undefined") var gMake = "";
gMake = go.GraphObject.make;


FmmlxShapes.FmmlxAssociation = {};


FmmlxShapes.FmmlxAssociation._sourceRole = gMake(go.TextBlock, new go.Binding("text", "sourceRole")
    , {
                                                     segmentIndex: 0,
                                                     segmentOffset: new go.Point(NaN, -10),
                                                     segmentOrientation: go.Link.OrientUpright
                                                 });

FmmlxShapes.FmmlxAssociation._sourceCardinality = gMake(go.TextBlock, new go.Binding("text", "sourceCardinality")
    , {
                                                            segmentIndex: 0,
                                                            segmentOffset: new go.Point(NaN, 10),
                                                            segmentOrientation: go.Link.OrientUpright
                                                        }
);

FmmlxShapes.FmmlxAssociation._targetRole = gMake(go.TextBlock, new go.Binding("text", "targetRole")
    , {
                                                     segmentIndex: -1,
                                                     segmentOffset: new go.Point(NaN, -10),
                                                     segmentOrientation: go.Link.OrientUpright
                                                 });

FmmlxShapes.FmmlxAssociation._targetCardinality = gMake(go.TextBlock, new go.Binding("text", "targetCardinality")
    , {
                                                            segmentIndex: -1,
                                                            segmentOffset: new go.Point(NaN, 10),
                                                            segmentOrientation: go.Link.OrientUpright
                                                        });


FmmlxShapes.FmmlxAssociation._associationName = gMake(go.Panel, "Horizontal", {
                                                          alignment: go.Spot.Left,
                                                          segmentOffset: new go.Point(0, -10),
                                                          segmentOrientation: go.Link.OrientUpright
                                                      },
                                                      gMake(go.Panel, "Auto", {
                                                                minSize: new go.Size(10, 15),
                                                                margin: new go.Margin(0, 2, 0, 0)
                                                            },

                                                            gMake(go.Shape, "Rectangle", {
                                                                fill: "black"
                                                            }),
                                                            gMake(go.TextBlock, new go.Binding("text", "sourceIntrinsicness"),
                                                                  {
                                                                      stroke: "white",
                                                                      margin: new go.Margin(0, 2, 0, 2),
                                                                      font: "bold 14px monospace",
                                                                      verticalAlignment: go.Spot.Center
                                                                  })
                                                      ),
                                                      //End Int 1 Block

                                                      gMake(go.TextBlock, new go.Binding("text", "name"), {
                                                          margin: new go.Margin(0, 2, 0, 2)
                                                      }),

                                                      gMake(go.Panel, "Auto", {
                                                                minSize: new go.Size(10, 15),
                                                                margin: new go.Margin(0, 2, 0, 0)
                                                            },

                                                            gMake(go.Shape, "Rectangle", {
                                                                fill: "black"
                                                            }),
                                                            gMake(go.TextBlock, new go.Binding("text", "targetIntrinsicness")
                                                                , {
                                                                      stroke: "white",
                                                                      margin: new go.Margin(0, 2, 0, 2),
                                                                      font: "bold 14px monospace",
                                                                      verticalAlignment: go.Spot.Center
                                                                  })
                                                      ));

FmmlxShapes.FmmlxAssociation.shape = gMake(go.Link,
                                           {
                                               routing: go.Link.Orthogonal,  // may be either Orthogonal or AvoidsNodes
                                               curve: go.Link.JumpGap
                                           },
                                           gMake(go.Shape, {strokeDashArray: [1, 3]}) // this is the link shape
    , gMake(go.Shape, {
        toArrow: "Standard"
    }), FmmlxShapes.FmmlxAssociation._sourceRole
    , FmmlxShapes.FmmlxAssociation._sourceCardinality
    , FmmlxShapes.FmmlxAssociation._associationName
    , FmmlxShapes.FmmlxAssociation._targetRole
    , FmmlxShapes.FmmlxAssociation._targetCardinality
);

console.log(`FMMLXAssociation Loaded`);