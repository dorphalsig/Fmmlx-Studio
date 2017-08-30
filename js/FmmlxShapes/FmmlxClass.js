"use strict";

if (typeof FmmlxShapes === "undefined") window.FmmlxShapes = {};
if (typeof gMake === "undefined") window.gMake = go.GraphObject.make;

FmmlxShapes.FmmlxClass = {};

/**
 * Returns font Style for the name block. if class isAbstract then the style is Oblique
 * @param {string} isAbstract
 * @returns {string}
 */
FmmlxShapes.FmmlxClass.getFontStyle = function (isAbstract) {
    let font = `15px 'Cormorant', serif`;
    if (isAbstract) font = `Italic ${font}`;
    return font;
};

/**
 *  Returns the font color based on the classification level of the Fmmlx Class
 *  (black for 0 and 1, white all else)
 * @param {string} level
 * @returns {string}
 */
FmmlxShapes.FmmlxClass.getFontColor = function (level) {
    return (Number.parseInt(level) < 2) ? "#000000" : "#FFFFFF";
};

/**
 * Specifies background color based on level
 * @param {string} level
 * @returns {string}
 */
FmmlxShapes.FmmlxClass.getBgColor = function (level) {
    let color = "";
    level = Number.parseInt(level);
    switch (isNaN(level) || level) {
        case 0:
            color = "#E6E6E6";
            break;
        case 1:
            color = "#FFFFFF";
            break;
        case 2:
            color = "#000000";
            break;
        case 3:
            color = "#000074";
            break;
        case 4:
            color = "#910000";
            break;
        case 5:
            color = "#007C36";
            break;
        case true: // "?" <-- its a NaN
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
 */
FmmlxShapes.FmmlxClass.getName = function (fmmlxClass) {
    return `^${fmmlxClass.metaclassName.toUpperCase()}^ \n${fmmlxClass.name}`;
};

FmmlxShapes.FmmlxClass.getIsExternal = function (fmmlxClass) {
    return fmmlxClass.isExternal;
};

FmmlxShapes.FmmlxClass._externalLanguageBlock = gMake(go.Panel, "Auto", {
    stretch: go.GraphObject.Fill,
    alignment: new go.Spot(1, 0),
    maxSize: new go.Size(54, Infinity),
}, new go.Binding("visible", "", FmmlxShapes.FmmlxClass.getIsExternal), gMake(go.Shape, "Rectangle", {
    fill: "orange",
}), gMake(go.TextBlock, new go.Binding("text", "w"), {
    margin: 2,
    wrap: go.TextBlock.None,
    overflow: go.TextBlock.OverflowEllipsis,
    toolTip: gMake(go.Adornment, "Auto", gMake(go.Shape, {
        fill: "#FFFFCC",
    }), gMake(go.TextBlock, {
        margin: 4,
    }, new go.Binding("text", "externalLanguage"))) // end of Adornment
}));


FmmlxShapes.FmmlxClass._nameBlock = gMake(go.Panel, "Auto", {
        stretch: go.GraphObject.Fill,
        minSize: new go.Size(100, 20),
    },
    gMake(go.Shape, "Rectangle", new go.Binding("fill", "level", FmmlxShapes.FmmlxClass.getBgColor)),
    gMake(go.TextBlock,
        new go.Binding("text", "", FmmlxShapes.FmmlxClass.getName),
        new go.Binding("font", "isAbstract", FmmlxShapes.FmmlxClass.getFontStyle),
        new go.Binding("stroke", "level", FmmlxShapes.FmmlxClass.getFontColor),
        {
            textAlign: "center",
            margin: 7,
        }));


FmmlxShapes.FmmlxClass._attributesBlock = gMake(go.Panel, "Auto", {
    stretch: go.GraphObject.Fill,
    minSize: new go.Size(100, 20),
}, gMake(go.Shape, "Rectangle", {
    fill: "white",
}), gMake(go.Panel, "Vertical", {
    margin: 4,
    defaultAlignment: go.Spot.Left,
}, new go.Binding("itemArray", "attributes"), {
    itemTemplate: FmmlxShapes.FmmlxProperty.shape,
}));


FmmlxShapes.FmmlxClass._operationsBlock = gMake(go.Panel, "Auto", {
    stretch: go.GraphObject.Fill,
    minSize: new go.Size(100, 20),
}, gMake(go.Shape, "Rectangle", {
    fill: "white",
}), gMake(go.Panel, "Vertical", {
    margin: 4,
    defaultAlignment: go.Spot.Left,
}, new go.Binding("itemArray", "operations"), {
    itemTemplate: FmmlxShapes.FmmlxProperty.shape,
}));


FmmlxShapes.FmmlxClass._slotValuesBlock = gMake(go.Panel, "Auto", {
    stretch: go.GraphObject.Fill,
    minSize: new go.Size(100, 20),
}, gMake(go.Shape, "Rectangle", {
    fill: "white",
}), gMake(go.Panel, "Vertical", {
    margin: 4,
    defaultAlignment: go.Spot.Left,
}, new go.Binding("itemArray", "slotValues"), {
    itemTemplate: FmmlxShapes.FmmlxProperty.shape,
}));


FmmlxShapes.FmmlxClass._operationValuesBlock = gMake(go.Panel, "Auto", {
    stretch: go.GraphObject.Fill,
    minSize: new go.Size(100, 20),
}, gMake(go.Shape, "Rectangle", {
    fill: "white",
}), gMake(go.Panel, "Vertical", {
    margin: 4,
    defaultAlignment: go.Spot.Left,
}, new go.Binding("itemArray", "operationValues"), {
    itemTemplate: FmmlxShapes.FmmlxProperty.shape,
}));

FmmlxShapes.FmmlxClass._mainBlock = gMake(go.Panel, "Vertical", FmmlxShapes.FmmlxClass._nameBlock,
    FmmlxShapes.FmmlxClass._attributesBlock,
    FmmlxShapes.FmmlxClass._operationsBlock,
    FmmlxShapes.FmmlxClass._slotValuesBlock, FmmlxShapes.FmmlxClass._operationValuesBlock);


FmmlxShapes.FmmlxClass._contextMenu = gMake(go.Adornment,
    "Vertical",
    {alignment: go.Spot.Left},
    gMake("ContextMenuButton", gMake(go.TextBlock, "Abstract Class"), {
        click: Controller.FormController.abstractClass,
    }),
    gMake("ContextMenuButton", gMake(go.TextBlock, "Delete Class"), {
        click: Controller.FormController.deleteClass,
    }),

    gMake("ContextMenuButton", gMake(go.TextBlock, "Add Property / Value"), {
        click: Controller.FormController.displayPropertyForm,
    }),

    gMake("ContextMenuButton", gMake(go.TextBlock, "Associate"), {
        click: Controller.FormController.displayAssociationForm,
    }),

    gMake("ContextMenuButton", gMake(go.TextBlock, "Set Superclass"), {
        click: Controller.FormController.displayInheritanceForm,
    }));


FmmlxShapes.FmmlxClass.shape = gMake(go.Node,
    "Spot",
    {
        contextClick: Controller.FormController.showHideContextMenu,
        doubleClick: Controller.FormController.displayClassForm,
    },
    new go.Binding("location", "location", go.Point.parse),
    FmmlxShapes.FmmlxClass._mainBlock,
    FmmlxShapes.FmmlxClass._externalLanguageBlock);
    

