"use strict";
if (typeof Controller === "undefined") {
    var Controller;
    Controller = {};
}

Controller.StudioController = class {

    constructor(div) {
        if (typeof div === "undefined") {
            div = "canvas";
        }
        go.licenseKey = "54fe4ee3b01c28c702d95d76423d6cbc5cf07f21de8349a00a5042a3b95c6e172099bc2a01d68dc986ea5efa4e2dc8d8dc96397d914a0c3aee38d7d843eb81fdb53174b2440e128ca75420c691ae2ca2f87f23fb91e076a68f28d8f4b9a8c0985dbbf28741ca08b87b7d55370677ab19e2f98b7afd509e1a3f659db5eaeffa19fc6c25d49ff6478bee5977c1bbf2a3";
        this._$ = go.GraphObject.make;
        this._diagram = this._$(go.Diagram, div, {
            padding: new go.Margin(75, 5, 5, 5),
            "undoManager.isEnabled": true, // enable Ctrl-Z to undo and Ctrl-Y to redo
            model: new go.GraphLinksModel(),
            contextMenu: this._$(go.Adornment, "Vertical",
                this._$("ContextMenuButton",
                    this._$(go.TextBlock, "Add Fmmlx Class"),
                    {
                        click: function (e, obj) {
                            Controller.FormController.displayClassForm(go.Point.stringify(e.documentPoint))
                        }
                    })
            )
        });

        window.PIXELRATIO = this._diagram.computePixelRatio();

        this._diagram.nodeTemplateMap.add("fmmlxClass", FmmlxShapes.FmmlxClass.shape);
        this._diagram.linkTemplateMap.add("fmmlxAssociation", FmmlxShapes.FmmlxAssociation.shape);
        //linkTemplates.add("fmmlxInheritance", FmmlxShapes.FmmlxInheritance.shape);
        this._diagram.model.nodeKeyProperty = "id";
        this._model = this._diagram.model;

    }

    /**
     * Adds a new FMMLX Class to the diagram
     * @param x
     * @param y
     * @param name
     * @param level
     * @param externalLanguage
     * @param externalMetaclass
     * @returns {*}
     */
    addFmmlxClass(point, name, level, isAbstract, externalLanguage, externalMetaclass) {

        //Step 1 Search for dupes

        let fmmlxClass = new Model.FmmlxClass(name, level, isAbstract, externalLanguage, externalMetaclass);
        let dupe = this._model.findNodeDataForKey(fmmlxClass.id);
        if (dupe !== null)
            throw  new Error(`An equivalent class definition already exists.`);            

        //Step 2 Add basic definition to diagram
        let transactionId = Helper.Helper.uuid4();

        console.log(`${transactionId} :: Start Transaction`);
        console.log(`${transactionId} :: Add Class ${name}`);
        this._diagram.startTransaction(transactionId);

        let nodeData = {
            location: go.Point.parse(point),
            category: "fmmlxClass",
            get (target, key) {
                if (["location", "category"].indexOf(key) === -1)
                    return target[key];
                return this[key]
            },
            set (target, key, value) {
                if (["location", "category"].indexOf(key) === -1)
                    target[key] = value;
                this[key] = value
            },
        };

        fmmlxClass.lastChangeId = transactionId;
        let nodeProxy = new Proxy(fmmlxClass, nodeData);
        this._diagram.model.addNodeData(nodeProxy);
        this._diagram.commitTransaction(transactionId);
        console.log(`${transactionId} :: End Transaction`);
    }

    /**
     *
     * @param {Model.FmmlxClass} fmmlxClass
     * @param level
     */
    fmmlxClassLevelChange(fmmlxClass, newLevel, upstream = true, txId = undefined) {
        if (!upstream && ( typeof fmmlxClass.metaclass !== "undefined" || typeof fmmlxClass.superclass !== undefined))
            throw new Error(`${fmmlxClass.name}  has predecessors (metaclass / superclass). Only the complete instantiation tree can be raised/lowered`)

        if (newLevel === fmmlxClass.level)
            return;

        //let txId = Helper.Helper.uuid4();
        let delta = (newLevel === "?") ? "?" : (fmmlxClass.level === "?") ? newLevel - fmmlxClass.distanceFromRoot : newLevel - fmmlxClass.level();


        //model.setDataProperty(fmmlxClass,)
    }

}
