"use strict";
if (typeof Controller === "undefined") window.Controller = {};

Controller.StudioController = class {

    /**
     *  Constructor, receives the id of the div that's the parent for the GoJS canvas
     * @param {string} div
     */
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
                        click: Controller.FormController.displayClassForm
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
     * Obtains a transaction id, starts the transaction and returns the id
     * @returns {*}
     * @private
     */
    __beginTransaction() {
        let transactionId = Helper.Helper.uuid4();
        this._diagram.startTransaction(transactionId);
        console.log(`${transactionId} :: Start Transaction`);
        return transactionId;
    }


    __commitTransaction(id) {
        console.log(`%c${transactionId} :: Committing Transaction`, 'color: green');
        if (!this._diagram.commitTransaction(id)) {
            console.log(`%Commit Fail!%c Transaction ${id} - Attempting rollback`, "color: cyan; font-size:16px;  background-color:black", "");
            throw new Error("Transaction commit failed - Rolled back succesfully Check the console for more info.")
        }
    }

    __rollbackTransaction(id) {
        console.log(`${transactionId} :: Rollback Transaction`);
        if (!this._diagram.rollbackTransaction(id)) {
            console.log(`%Rollback Fail!%c Transaction ${id} -- Attempting rollback`, "color: cyan; font-size:16px;  background-color:black", "");
            throw new Error("Transaction rollback failed -  Check the console for more info.")
        }
    }

    /**
     * Adds a new FMMLX Class to the diagram
     * @param {string} point
     * @param {string} name
     * @param {string} isAbstract
     * @param {string} level
     * @param {string} externalLanguage
     * @param {string} externalMetaclass
     * @returns undefined
     */
    addFmmlxClass(point, name, level, isAbstract, externalLanguage, externalMetaclass) {

        //Step 1 Search for dupes

        let fmmlxClass = new Model.FmmlxClass(name, level, isAbstract, externalLanguage, externalMetaclass);
        let dupe = this._model.findNodeDataForKey(fmmlxClass.id);
        if (dupe !== null)
            throw  new Error(`An equivalent class definition already exists.`);

        let transactionId = this.__beginTransaction();
        //Step 2 Add basic definition to diagram
        console.log(`${transactionId} :: Add Class ${name}`);

        let nodeData = {
            location: point,
            category: "fmmlxClass",
            get (target, key) {
                if (key == "fmmlxClass") {
                    return target;
                }
                else if (["location", "category"].indexOf(key) === -1)
                    return target[key];
                return this[key]
            },
            set (target, key, value) {
                if (["location", "category"].indexOf(key) === -1)
                    target[key] = value;
                this[key] = value
            },
        };
        try {
            fmmlxClass.lastChangeId = transactionId;
            let nodeProxy = new Proxy(fmmlxClass, nodeData);
            this._diagram.model.addNodeData(nodeProxy);
        }
        catch (e) {
            this.__rollbackTransaction(transactionId);
            throw e;
        }
        this.__commitTransaction(transactionId);
        console.log(`${transactionId} :: End Transaction`);
    }

    /**
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxClass} metaclass
     */
    changeFmmlxMetaclass(fmmlxClass, metaclass) {
        if (fmmlxClass.isExternal)
            throw new Error("External classes can not have a local metaclass");

        let transactionId = this.__beginTransaction();
        console.log(`${transactionId} :: Change Metaclass for ${fmmlxClass.name} from  ${fmmlxClass.metaclass.name} to ${metaclass.name}`);

        for (let delProp of fmmlxClass.metaclass.properties) this.deleteProperty(fmmlxClass, delProp, false, true);

        fmmlxClass.metaclass = metaclass;

        for (let newProp of fmmlxClass.metaclass.properties) this.addProperty(fmmlxClass, newProp);
    }

    /**
     * Deletes <Property> (and/or its corresponding <Value>) from <fmmlxClass>, its predecessors ("upstream") and descendants ("downstream")
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxProperty} property
     * @param {boolean} upstream
     * @param {boolean} downstream
     * @private
     */
    deleteProperty(fmmlxClass, property, upstream = false, downstream = true) {

        let transId = this.__beginTransaction();
        try {
            //Delete Own
            let pVal = fmmlxClass.findValueFromProperty(property);
            if (pVal !== null) {
                fmmlxClass.deleteValue(pVal);
                property.deleteValue(pVal);
            }

            fmmlxClass.deleteProperty(property);
            property.deleteClass(fmmlxClass);

            let

                if;
            (downstream);
            {
                for (let instance of fmmlxClass.instances) {
                    this.deleteProperty(instance, property, upstream, downstream);
                }

                for (let subclass of fmmlxClass.subclasses) {
                    this.deleteProperty(subclass, property, upstream, downstream);
                }
            }

            if (upstream) {
                if (fmmlxClass.superclass !== null) {
                    this.deleteProperty(fmmlxClass.superclass, property, upstream, downstream);
                }
                if (fmmlxClass.metaclass !== null) {
                    this.deleteProperty(fmmlxClass.metaclass, property, upstream, downstream);
                }
            }

        }
        catch (e) {
            his.__rollbackTransaction(transId);
        }
    }


    /**
     * Adds <Property> to <fmmlxClass> and its descendants
     * @param fmmlxClass
     * @param property
     */
    addProperty(fmmlxClass, property) {

    }


};
