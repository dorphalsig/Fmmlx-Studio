`use strict`;
if (typeof Controller === `undefined`) window.Controller = {};

Controller.StudioController = class {

    /**
     *  Constructor, receives the id of the div that's the parent for the GoJS canvas
     * @param {string} div
     */
    constructor(div) {
        if (typeof div === `undefined`) {
            div = `canvas`;
        }
        go.licenseKey = `54fe4ee3b01c28c702d95d76423d6cbc5cf07f21de8349a00a5042a3b95c6e172099bc2a01d68dc986ea5efa4e2dc8d8dc96397d914a0c3aee38d7d843eb81fdb53174b2440e128ca75420c691ae2ca2f87f23fb91e076a68f28d8f4b9a8c0985dbbf28741ca08b87b7d55370677ab19e2f98b7afd509e1a3f659db5eaeffa19fc6c25d49ff6478bee5977c1bbf2a3`;
        this._$ = go.GraphObject.make;

        /**
         *
         * @type {go.Diagram | *}
         * @private
         */
        this._diagram = this._$(go.Diagram, div, {
            padding: new go.Margin(75, 5, 5, 5), "undoManager.isEnabled": true, // enable Ctrl-Z to undo and Ctrl-Y to redo
            model: new go.GraphLinksModel(),
            contextMenu: this._$(go.Adornment, `Vertical`, this._$(`ContextMenuButton`, this._$(go.TextBlock, `Add Fmmlx Class`), {
                click: Controller.FormController.displayClassForm
            }))
        });

        this._model = this._diagram.model;

        window.PIXELRATIO = this._diagram.computePixelRatio();

        this._diagram.nodeTemplateMap.add(`fmmlxClass`, FmmlxShapes.FmmlxClass.shape);
        this._diagram.linkTemplateMap.add(`fmmlxAssociation`, FmmlxShapes.FmmlxAssociation.shape);
        //linkTemplates.add(`fmmlxInheritance`, FmmlxShapes.FmmlxInheritance.shape);
        this._model.nodeKeyProperty = `id`;


    }

    __beginTransaction() {
        let id = Helper.Helper.uuid4();
        this._diagram.startTransaction(id);
        console.log(`${id} :: Begin Transaction`);
        console.group();
        return id;
    }

    __commitTransaction(id) {
        if (!this._diagram.commitTransaction(id)) {
            console.warn(`✖ Commit Fail! Transaction ${id} - Attempting rollback`);
            console.groupEnd();
            throw new Error(`Transaction commit failed - Rolled back successfully Check the console for more info.`);
        }
        console.log(`✔ ${id} :: Transaction committed`);
        console.groupEnd();
    }

    __rollbackTransaction() {
        let id = this._diagram.undoManager.currentTransaction;
        if (!this._diagram.rollbackTransaction()) {
            console.error(`✖  %Rollback Fail!%c Transaction ${id} -- Attempting rollback`, `color: cyan; font-size:16px;  background-color:black`, ``);
            console.groupEnd();
            throw new Error(`Transaction rollback failed -  Check the console for more info.`);
        }
        console.groupEnd();
        console.warn(`🡆 ${id} :: Rollback Transaction`);

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
        if (dupe !== null) throw  new Error(`An equivalent class definition already exists.`);

        console.log(`Add Class ${name}`);
        let transId = this.__beginTransaction();
        //Step 2 Add basic definition to diagram

        let nodeData = {
            location: point, category: `fmmlxClass`, get(target, key) {
                if (key === `fmmlxClass`) {
                    return target;
                } else if ([`location`, `category`].indexOf(key) === -1) return target[key];
                return this[key];
            }, set(target, key, value) {
                if ([`location`, `category`].indexOf(key) === -1) target[key] = value;
                this[key] = value;
            }
        };
        try {
            fmmlxClass.lastChangeId = transId;
            let nodeProxy = new Proxy(fmmlxClass, nodeData);
            this._diagram.model.addNodeData(nodeProxy);
        }
        catch (e) {
            this.__rollbackTransaction();
            throw e;
        }
        this.__commitTransaction(transId);
    }

    /**
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxClass} metaclass
     */
    changeClassMetaclass(fmmlxClass, metaclass) {
        if (fmmlxClass.isExternal) throw new Error(`External classes can not have a local metaclass`);

        if ((metaclass.level !== `?` && fmmlxClass.level === `?`) || metaclass.level !== fmmlxClass.level + 1) {
            throw new Error(`Metaclass (${metaclass.name}) level must be ${fmmlxClass.level + 1}`);
        }
        if (fmmlxClass.metaclass.equals(metaclass)) {
            console.log(`Old and new metaclasses are the same. Doing nothing.`);
        }

        console.log(`Change ${fmmlxClass.name}'s metaclass from  ${fmmlxClass.metaclass.name} to ${metaclass.name}`);
        let transId = this.__beginTransaction();
        try {
            let deletableProperties = fmmlxClass.metaclass.attributes.concat(fmmlxClass.operations);

            for (let property of deletableProperties) {
                this.deletePropertyFromClass(fmmlxClass, property);
            }

            let newProperties = metaclass.attributes.concat(fmmlxClass.operations);

            for (let property of newProperties) {
                this.addPropertyToClass(fmmlxClass, property);
            }
        }
        catch (error) {
            this.__rollbackTransaction();
            throw error;
        }
        this.__commitTransaction(transId);
    }

    /**
     * Changes the level of an FMMLx Class, reevaluates its properties and propagates the changes up and downstream
     * @param fmmlxClass
     * @param newLevel
     */
    changeClassLevel(fmmlxClass, newLevel) {
        newLevel = newLevel === "?" ? "?" : Number.parseFloat(newLevel);
        if (newLevel === fmmlxClass.level) return;

        let delta = isNaN(newLevel) ? 0 : (fmmlxClass.level === "?") ? newLevel - fmmlxClass.distanceFromRoot : newLevel - fmmlxClass.level;
        console.log(`Changing ${fmmlxClass.name}'s level from ${fmmlxClass.level} to ${newLevel}`);
        let transId = this.__beginTransaction();
        try{
            this._calculateClassLevel(fmmlxClass,delta,true, transId);
        }
        catch (error){
            this.__rollbackTransaction();
        }
        this.__commitTransaction(transId);
    }


    /**
     *  Changes the level of an FMMLx Class by delta, reevaluates its properties and propagates the changes downstream, and optionally upstream.
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {number|NaN} delta: NaN => change to "?"
     * @param upstream
     * @param transId
     */
    _calculateClassLevel(fmmlxClass, delta, upstream, transId = null) {
        if (fmmlxClass.lastChangeId === transId) return;

        if (upstream) {
            if (fmmlxClass.metaclass !== null) this._calculateClassLevel(fmmlxClass.metaclass, delta, upstream, transId);
            if (fmmlxClass.superclass !== null) this._calculateClassLevel(fmmlxClass.superclass, delta, upstream, transId);
        }

        fmmlxClass.level = (delta === 0) ? "?" : (fmmlxClass.level === "?") ? fmmlxClass.distanceFromRoot + delta : fmmlxClass.level + delta;
        for (let property of fmmlxClass.attributes.concat(fmmlxClass.operations)) {
            let transId2 = this.__beginTransaction();
            try {
                this.processProperty(fmmlxClass, property, transId2);
            }
            catch(error){
                this.__rollbackTransaction();
                throw error;
            }
            this.__commitTransaction(transId2);
            fmmlxClass.lastChangeId = transId2;
        }
        fmmlxClass.lastChangeId = transId;

        for (let instance of fmmlxClass.instances) {
            this._calculateClassLevel(instance, delta, upstream, transId);
        }

        for (let subclass of fmmlxClass.subclasses) {
            this._calculateClassLevel(subclass, delta, upstream, transId);
        }
    }

    /**
     * Deletes <Property> (and/or its corresponding <Value>) from <fmmlxClass>, its predecessors (`upstream`) and descendants (`downstream`)
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxProperty} property
     * @param {boolean} upstream
     * @param {boolean} downstream
     */
    deletePropertyFromClass(fmmlxClass, property, upstream = false, downstream = true) {
        //if prop or value do not exist there's nothing to do.
        if (!fmmlxClass.hasPropertyOrValue(property)) {
            console.log(`Property ${property.name} (and/or its value) not found in ${fmmlxClass.name}!`);
            return;
        }

        let transId = this.__beginTransaction();
        console.log(`Delete Property ${property.name} (and/or its value) from ${fmmlxClass.name}`);

        try {
            //Delete Property
            let array = fmmlxClass.findCorrespondingArray(property);
            let index = fmmlxClass.findIndexForProperty(property);
            this._model.removeArrayItem(array, index);

            //Delete Value (if present)
            let value = fmmlxClass.findValueFromProperty(property);
            this.deleteValueFromClass(fmmlxClass, value);

            // if this is not part of another transaction mark the class as changed
            if (this._model.undoManager.transactionLevel > 1) fmmlxClass.lastChangeId = transId;

            //del downstream
            if (downstream) {
                for (let instance of fmmlxClass.instances) {
                    this.deletePropertyFromClass(instance, property, upstream, downstream);
                }
                for (let subclass of fmmlxClass.subclasses) {
                    this.deletePropertyFromClass(subclass, property, upstream, downstream);
                }
            }

            //del upstream
            if (upstream) {
                if (fmmlxClass.superclass !== null) this.deletePropertyFromClass(fmmlxClass.superclass, property, upstream, downstream);
                if (fmmlxClass.metaclass !== null) this.deletePropertyFromClass(fmmlxClass.metaclass, property, upstream, downstream);
            }
        }
        catch (e) {
            this.__rollbackTransaction();
        }
        this.__commitTransaction(transId);
    }

    /**
     * Deletes (if exists) <Value> from FmmlxClass
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxValue} value
     */
    deleteValueFromClass(fmmlxClass, value) {
        let index = fmmlxClass.findIndexForValue(value);
        if (index === null) {
            console.log(`Value not found in class. Doing nothing.`);
            return;
        }

        console.log(`${transId} :: Delete Value for ${value.property.name} in ${fmmlxClass.name}`);
        let transId = this.__beginTransaction();
        try {
            let array = fmmlxClass.findCorrespondingArray(value);
            value.property.deleteValue(value);
            this._model.removeArrayItem(array, index);
        }
        catch (error) {
            this.__rollbackTransaction(transId);
            throw error;
        }
        if (this._model.undoManager.transactionLevel > 1) fmmlxClass.lastChangeId = transId;
    }

    /**
     * Adds <Property> to <fmmlxClass> and its descendants (if it does not exist)
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxProperty} property
     */
    addPropertyToClass(fmmlxClass, property) {
        //Do nothing if it already exists of if property.intrinsicness >= fmmlxClass.level
        if (fmmlxClass.level <= property.intrinsicness || fmmlxClass.hasPropertyOrValue(property)) {
            console.log(`Property already exists OR intrinsicness >= level. doing nothing`);
            return;
        }

        console.log(`Adding ${property.name} to ${fmmlxClass.name}`);
        let transId = this.__beginTransaction();
        try {
            let array = fmmlxClass.findCorrespondingArray(property);
            this._model.addArrayItem(array, property);
            property.addClass(fmmlxClass);
            if (this._model.undoManager.transactionLevel > 1) fmmlxClass.lastChangeId = transId;
        }
        catch (error) {
            this.__rollbackTransaction();
            throw  error;
        }
        //Replicate downstream
        for (let instance of fmmlxClass.instances) {
            this.addPropertyToClass(instance, property);
            this.processProperty(fmmlxClass, property, transId);
        }

        for (let subclass of fmmlxClass.subclasses) {
            this.addPropertyToClass(subclass, property);
            this.processProperty(fmmlxClass, property, transId);
        }

        this.__commitTransaction(transId);
    }

    /**
     * Deletes the corresponding property from FmmlxClass and descendants, creates a new value and adds it
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxProperty} property
     */
    addValueToClass(fmmlxClass, property) {

        if ((property.intrinsicness === "?" && fmmlxClass.level === "?") || property.intrinsicness !== fmmlxClass.level) {
            console.log(`Class (${fmmlxClass.name}) level (${fmmlxClass.level}) is different from the property's (${property.name}) intrinsicness (${property.intrinsicness}). Doing nothing`);
            return;
        }

        value.class = fmmlxClass;
        if (fmmlxClass.findIndexForValue(value) !== null) {
            console.log(`A value of ${value.property.name} already exists ${fmmlxClass.name}. doing Nothing`);
            return;
        }

        console.log(`Adding a value of ${value.property.name} to ${fmmlxClass.name}`);
        let transId = this.__beginTransaction();
        //the property gets deleted from here downwards
        this.deletePropertyFromClass(fmmlxClass, value.property);

        try {
            let array = fmmlxClass.findCorrespondingArray(value);
            this._model.addArrayItem(array, item);
        }
        this.__commitTransaction(transId);

        if (this._model.undoManager.transactionLevel > 1) fmmlxClass.lastChangeId = transId;
    }

    /**
     * Checks what to do with a property in a class:
     *  if intrinsicness > level : the property + its value is deleted
     *  if intrinsicness = level: the property gets deleted +  a value is created
     *  if instrisicness < level: if there is a value its gets deleted and the property gets added
     *
     *  Then it does the same for each class downstream.
     *
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxProperty} property
     * @param {Number} transId
     */
    processProperty(fmmlxClass, property, transId) {
        //if its already processed do nothing
        if (transId === fmmlxClass.lastChangeId) {
            console.log(`Transaction already processed. Doing nothing.`);
            return;
        }

        if (property.intrinsicness > fmmlxClass.level) { //if intrinsicness > level : the property + its value is deleted
            this.deletePropertyFromClass(fmmlxClass, property);
        } else if (property.intrinsicness === fmmlxClass.level && property.intrinsicness !== "?") { // if intrinsicness = level: the property gets deleted +  a value is created
            this.deletePropertyFromClass(fmmlxClass, property);
            this.addValueToClass(fmmlxClass, property);
        } else { //if instrisicness < level: if there is a value its gets deleted and the property gets added
            let val = fmmlxClass.findValueFromProperty(property);
            if (val !== null) this.deleteValueFromClass(fmmlxClass, val);
            this.addPropertyToClass(fmmlxClass, property);
        }
    }


};
