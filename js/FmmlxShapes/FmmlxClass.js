"use strict";

if (typeof FmmlxShapes === "undefined") {
    window.FmmlxShapes = {};
}
if (typeof gMake === "undefined") {
    window.gMake = go.GraphObject.make;
}

//FmmlxShapes.FmmlxClass = {};

FmmlxShapes.FmmlxClass = class {
    static get _externalLanguageBlock() {
        return gMake(go.Panel, "Auto", {
            stretch: go.GraphObject.Fill,
            alignment: new go.Spot(1, 0),
            maxSize: new go.Size(54, Infinity),
            name: "externalLanguageBlock"
        }, new go.Binding("visible", "", this.getIsExternal), gMake(go.Shape, "Rectangle", {
            fill: "orange",
        }), gMake(go.TextBlock, new go.Binding("text", "externalLanguage"), {
            margin: 2,
            wrap: go.TextBlock.None,
            stroke: "black",
            overflow: go.TextBlock.OverflowEllipsis,
            toolTip: gMake(go.Adornment, "Auto", gMake(go.Shape, {
                fill: "#FFFFCC",
            }), gMake(go.TextBlock, {
                margin: 4,
            }, new go.Binding("text", "externalLanguage"))) // end of Adornment
        }));
    }

    static get _mainBlock() {
        return gMake(go.Panel, "Vertical", {name: "mainBlock"}, this._nameBlock, this.genericBlock("attributes"), this.genericBlock("operations"), this.genericBlock("slotValues"), this.genericBlock("operationValues"));
    }

    static get _nameBlock() {
        return gMake(go.Panel, "Auto", {
            stretch: go.GraphObject.Fill, minSize: new go.Size(100, 20), name: "nameBlock"
        }, gMake(go.Shape, "Rectangle", new go.Binding("fill", "level", this.getBgColor)), gMake(go.TextBlock, new go.Binding("text", "", this.getName), new go.Binding("font", "isAbstract", this.getFontStyle), new go.Binding("stroke", "level", this.getFontColor), {
            textAlign: "center", margin: 7,
        }));
    }

    static get shape() {
        return gMake(go.Node, "Spot", {
            doubleClick: Controller.FormController.displayClassForm,
            contextClick: Controller.FormController.displayContextMenu,
        }, new go.Binding("location", "location", go.Point.parse), this._mainBlock, this._externalLanguageBlock);
    }

    static genericBlock(collectionName) {
        return gMake(go.Panel, "Auto", {
            stretch: go.GraphObject.Fill, minSize: new go.Size(100, 20)
        }, gMake(go.Shape, "Rectangle", {
            fill: "white",
        }), gMake(go.Panel, "Vertical", {
            margin: 4, defaultAlignment: go.Spot.Left, name: collectionName
        }, new go.Binding("itemArray", collectionName), {
            itemTemplate: FmmlxShapes.FmmlxProperty.shape,
        }))
    };

    /**
     * Specifies background color based on level
     * @param {string} level
     * @returns {string}
     */
    static getBgColor(level) {
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
     *  Returns the font color based on the classification level of the Fmmlx Class
     *  (black for 0 and 1, white all else)
     * @param {string} level
     * @returns {string}
     */
    static getFontColor(level) {
        return (Number.parseInt(level) < 2) ? "#000000" : "#FFFFFF";
    };

    /**
     * Returns font Style for the name block. if class isAbstract then the style is Oblique
     * @param {string} isAbstract
     * @returns {string}
     */
    static getFontStyle(isAbstract) {
        let font = `15px 'Roboto', sans-serif`;
        if (isAbstract) {
            font = `Italic ${font}`;
        }
        return font;
    };

    static getIsExternal(fmmlxClass) {
        return fmmlxClass.isExternal;
    };

    /**
     *  Gets the name string to display. that is ^^ META ^^ \n Name
     * @param {Model.FmmlxClass} fmmlxClass
     */
    static getName(fmmlxClass) {
        return `^${fmmlxClass.metaclassName.toUpperCase()}^\n${fmmlxClass.name} (${fmmlxClass.level})`;
    };

};
