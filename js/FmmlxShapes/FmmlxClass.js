"use strict";

if (typeof FmmlxShapes === "undefined") var FmmlxShapes = {}
if (typeof gMake === "undefined") var gMake = "";
gMake = go.GraphObject.make;

FmmlxShapes.FmmlxClass = {};


/**
 *
 * @param {string} isAbstract
 * @returns {string}
 * @private
 */
FmmlxShapes.FmmlxClass._getFontStyle = function (isAbstract) {
    let font =  `15px 'Open Sans', sans-serif`
    if (isAbstract === "true")
        font = "Oblique" + font;
    return font;
};

FmmlxShapes.FmmlxClass._getFontColor = function(level){
    return (Number.parseInt(level) < 2)? "#000000":"#FFFFFF";
}

/**
 * Specifies background color based on level
 * @param {string} level
 * @returns {string}
 * @private
 */
FmmlxShapes.FmmlxClass._getBgColor = function (level) {

    let color = "";
    switch (level) {
        case "0":
            color = "#E6E6E6";
            break;
        case "1":
            color = "#FFFFFF";
            break;
        case "2":
            color = "#000000";
            break;
        case "3":
            color = "#000074";
            break;
        case "4":
            color = "#910000";
            break;
        case "5":
            color = "#007C36";
            break;
        case "?":
            color = "#C45911";
            break;
        default: //6+
            color = "#653C7B";
            break;
    }

    return color;
};

/**
 *  Gets the name string to display. that is ^^ META ^^ \n Name
 * @param {Model.FmmlxClass} fmmlxClass
 * @private
 */
FmmlxShapes.FmmlxClass._getName = function(fmmlxClass){
    let name = "";
    if(fmmlxClass.isExternal){
        name = (fmmlxClass.externalMetaclass === "") ? "^METACLASS^" : `^${fmmlxClass.externalMetaclass.toUpperCase()}^`;
    }
    else
        name = (fmmlxClass.metaclass === "") ? "^METACLASS^" : `^${fmmlxClass.metaclass.name.toUpperCase()}^`;

    name += `\n${fmmlxClass.name}`;

    return name;
}


FmmlxShapes.FmmlxClass._externalLanguageBlock = gMake(go.Panel, "Auto", {
        stretch: go.GraphObject.Fill,
        alignment: new go.Spot(1, 0),
        maxSize: new go.Size(54, Infinity)
    },
    gMake(go.Shape, "Rectangle", {
        fill: "orange"
    }),
    gMake(go.TextBlock,
        new go.Binding("text", "externalLanguage"), {
            margin: 2,
            wrap: go.TextBlock.None,
            overflow: go.TextBlock.OverflowEllipsis,
            toolTip: gMake(go.Adornment, "Auto",
                gMake(go.Shape, {
                    fill: "#FFFFCC"
                }),
                gMake(go.TextBlock, {
                        margin: 4
                    },
                    new go.Binding("text", "externalLanguage")
                )
            ) // end of Adornment
        })
);


FmmlxShapes.FmmlxClass._nameBlock = gMake(go.Panel, "Auto", {
        stretch: go.GraphObject.Fill
        , minSize: new go.Size(100, 20)
    },
    gMake(go.Shape, "Rectangle", new go.Binding("fill", "level", FmmlxShapes.FmmlxClass._getBgColor)),
    gMake(go.TextBlock,
        new go.Binding("text", "",FmmlxShapes.FmmlxClass._getName),
        new go.Binding("font", "", FmmlxShapes.FmmlxClass._getFontStyle),
        new go.Binding("stroke","level",FmmlxShapes.FmmlxClass._getFontColor),
        {
            textAlign: "center",
            margin: 7
        })
);


FmmlxShapes.FmmlxClass._attributesBlock = gMake(go.Panel, "Auto", {
        stretch: go.GraphObject.Fill
        , minSize: new go.Size(100, 20)
    },
    gMake(go.Shape, "Rectangle", {
        fill: "white"
    }),
    gMake(go.Panel, "Vertical", {
            margin: 4,
            defaultAlignment: go.Spot.Left
        },
        new go.Binding("itemArray", "attributes"), {
            itemTemplate: FmmlxShapes.FmmlxProperty.shape
        })
);


FmmlxShapes.FmmlxClass._operationsBlock = gMake(go.Panel, "Auto", {
        stretch: go.GraphObject.Fill
        , minSize: new go.Size(100, 20)
    },
    gMake(go.Shape, "Rectangle", {
        fill: "white"
    }),
    gMake(go.Panel, "Vertical", {
            margin: 4,
            defaultAlignment: go.Spot.Left
        },
        new go.Binding("itemArray", "operations"), {
            itemTemplate: FmmlxShapes.FmmlxProperty.shape
        })
);


FmmlxShapes.FmmlxClass._slotValuesBlock = gMake(go.Panel, "Auto", {
        stretch: go.GraphObject.Fill
        , minSize: new go.Size(100, 20)
    },
    gMake(go.Shape, "Rectangle", {
        fill: "white"
    }),
    gMake(go.Panel, "Vertical", {
            margin: 4,
            defaultAlignment: go.Spot.Left
        },
        new go.Binding("itemArray", "slotValues"), {
            itemTemplate: FmmlxShapes.FmmlxProperty.shape
        })
);


FmmlxShapes.FmmlxClass._operationValuesBlock = gMake(go.Panel, "Auto", {
        stretch: go.GraphObject.Fill
        , minSize: new go.Size(100, 20)
    },
    gMake(go.Shape, "Rectangle", {
        fill: "white"
    }),
    gMake(go.Panel, "Vertical", {
            margin: 4,
            defaultAlignment: go.Spot.Left
        },
        new go.Binding("itemArray", "operationValues"), {
            itemTemplate: FmmlxShapes.FmmlxProperty.shape
        })
);

FmmlxShapes.FmmlxClass._mainBlock = gMake(go.Panel, "Vertical", FmmlxShapes.FmmlxClass._nameBlock,
    FmmlxShapes.FmmlxClass._attributesBlock,
    FmmlxShapes.FmmlxClass._operationsBlock,
    FmmlxShapes.FmmlxClass._slotValuesBlock,
    FmmlxShapes.FmmlxClass._operationValuesBlock
);


FmmlxShapes.FmmlxClass._contextMenu = gMake(go.Adornment, "Vertical",
    gMake("ContextMenuButton",
        gMake(go.TextBlock, "Abstract Class"), {
            click: Controller.FormController.abstractClass
        }
    ),
    gMake("ContextMenuButton",
        gMake(go.TextBlock, "Delete Class"), {
            click: Controller.FormController.deleteClass
        })
);


FmmlxShapes.FmmlxClass.shape = gMake(go.Node, "Spot", {
    contextMenu: FmmlxShapes.FmmlxClass._contextMenu
}, FmmlxShapes.FmmlxClass._mainBlock    , FmmlxShapes.FmmlxClass._externalLanguageBlock);
;
    

