`use strict`;
if (typeof Controller === `undefined`) window.Controller = {};

Controller.StudioController = class {

    // Instance
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

    _beginTransaction() {
        let id = Helper.Helper.uuid4();
        this._diagram.startTransaction(id);
        console.log(`👉 ${id} :: Begin Transaction`);
        console.group();
        return id;
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

        let lvl = (delta === 0) ? "?" : (fmmlxClass.level === "?") ? fmmlxClass.distanceFromRoot + delta : fmmlxClass.level + delta;
        this._model.setDataProperty(fmmlxClass, "level", lvl);
        for (let property of fmmlxClass.attributes.concat(fmmlxClass.operations)) {
            let transId2 = this._beginTransaction();
            try {
                this.processProperty(fmmlxClass, property, transId2);
                this._model.setDataProperty(fmmlxClass, "lastChangeId", transId2);
            }
            catch (error) {
                this._rollbackTransaction();
                throw error;
            }
            this._commitTransaction(transId2);
        }

        for (let instance of fmmlxClass.instances) {
            this._calculateClassLevel(instance, delta, upstream, transId);
        }

        for (let subclass of fmmlxClass.subclasses) {
            this._calculateClassLevel(subclass, delta, upstream, transId);
        }
    }

    _commitTransaction(id) {
        this._diagram.commitTransaction(id);
        console.groupEnd();
        console.log(`✅ ${id} :: Transaction committed`);
    }

    /**
     * returns a list of fmmlx classes that meets each of filters
     * @param {Object} filters
     * @returns {Model.FmmlxClass[]}
     */
    _filterClasses(filters = {}) {
        filters.category = "fmmlxClass";

        return this._model.nodeDataArray.filter(function (nodeData) {
            let retVal = true;
            for (let filter in filters) {
                if (!filters.hasOwnProperty(filter) || !nodeData.hasOwnProperty(filter)) continue;
                retVal = retVal && nodeData[filter] === filters[filter];
            }
            return retVal;
        });

    }

    _rollbackTransaction() {
        let id = this._diagram.undoManager.currentTransaction;
        this._diagram.rollbackTransaction();
        console.groupEnd();
        console.warn(`❌ ${id} :: Rolled-back Transaction`);

    }

    /**
     * Adds a new FMMLX Class to the diagram
     * @param {string} point
     * @param {string} name
     * @param {string} isAbstract
     * @param {string} metaclassId
     * @param {string} level
     * @param {string} externalLanguage
     * @param {string} externalMetaclass
     * @returns undefined
     */
    addFmmlxClass(point, name, level, isAbstract, metaclassId = "", externalLanguage, externalMetaclass) {

        //Step 1 Search for dupes

        let fmmlxClass = new Model.FmmlxClass(name, level, isAbstract, externalLanguage, externalMetaclass);
        let dupe = this._model.findNodeDataForKey(fmmlxClass.id);
        if (dupe !== null) throw  new Error(`An equivalent class definition already exists.`);

        console.log(`Add Class ${name}`);
        let transId = this._beginTransaction();
        //Step 2 Add basic info to the model
        fmmlxClass.category = "fmmlxClass";
        fmmlxClass.location = point;
        //Step 3: Add it
        try {
            fmmlxClass.lastChangeId = transId;
            this._diagram.model.addNodeData(fmmlxClass);
            if (metaclassId !== "") this.changeMetaclass(fmmlxClass, metaclassId);
        }
        catch (e) {
            this._rollbackTransaction();
            throw e;
        }
        this._commitTransaction(transId);
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
        let transId = this._beginTransaction();
        try {
            let array = fmmlxClass.findCorrespondingArray(property);
            this._model.addArrayItem(array, property);
            property.addClass(fmmlxClass);
            if (this._model.undoManager.transactionLevel > 1) fmmlxClass.lastChangeId = transId;
        }
        catch (error) {
            this._rollbackTransaction();
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

        this._commitTransaction(transId);
    }

    /**
     * Deletes the corresponding property from FmmlxClass and descendants, creates a new value and adds it
     * @param {Model.FmmlxClass}  fmmlxClass
     * @param {Model.FmmlxProperty} property
     * @param {string} value
     * @return {Model.FmmlxValue}
     */
    addValueToClass(fmmlxClass, property, value = null) {

        if ((property.intrinsicness === "?" && fmmlxClass.level === "?") || property.intrinsicness !== fmmlxClass.level) {
            console.log(`Class (${fmmlxClass.name}) level (${fmmlxClass.level}) is different from the property's (${property.name}) intrinsicness (${property.intrinsicness}). Doing nothing`);
            return;
        }

        let val = property.createValue(value);
        val.class = fmmlxClass;

        if (fmmlxClass.findIndexForValue(val) !== null) {
            console.log(`A value of ${val.property.name} already exists ${fmmlxClass.name}. doing Nothing`);
            return;
        }
        console.log(`Adding a value of ${val.property.name} to ${fmmlxClass.name}`);
        let transId = this._beginTransaction();
        //the property gets deleted from here downwards
        this.deletePropertyFromClass(fmmlxClass, val.property);

        try {
            let array = fmmlxClass.findCorrespondingArray(val);
            this._model.addArrayItem(array, item);
        }
        catch (error) {
            this._rollbackTransaction();
            throw error;
        }
        this._commitTransaction(transId);

        if (this._model.undoManager.transactionLevel > 1) fmmlxClass.lastChangeId = transId;
        return val;
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
        let transId = this._beginTransaction();
        try {
            this._calculateClassLevel(fmmlxClass, delta, true, transId);
        }
        catch (error) {
            this._rollbackTransaction();
            throw error;
        }
        this._commitTransaction(transId);
    }

    /**
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {*} metaclassId
     */
    changeMetaclass(fmmlxClass, metaclassId = null) {


        if (metaclassId === null) {
            this.deleteMetaclass(fmmlxClass);
            return;
        }

        if (fmmlxClass.isExternal) throw new Error(`External classes can not have a local metaclass`);

        let metaclass = this._model.findNodeDataForKey(metaclassId);

        if ((metaclass.level !== `?` && fmmlxClass.level === `?`) || metaclass.level !== fmmlxClass.level + 1) {
            throw new Error(`Metaclass (${metaclass.name}) level must be ${fmmlxClass.level + 1}`);
        }
        if (fmmlxClass.metaclass !== null && fmmlxClass.metaclass.equals(metaclass)) {
            console.log(`Old and new metaclasses are the same. Doing nothing.`);
        }

        //let className = 
        console.log(`Change ${fmmlxClass.name}'s metaclass from  ${(fmmlxClass.metaclass === null) ? "Metaclass" : fmmlxClass.metaclass.name} to ${metaclass.name}`);

        let transId = this._beginTransaction();
        try {
            this.deleteMetaclass(fmmlxClass);
            this._model.setDataProperty(fmmlxClass, "metaclass", metaclass);
            metaclass.addInstance(fmmlxClass);
            let newProperties = metaclass.attributes.concat(fmmlxClass.operations);
            for (let property of newProperties) {
                this.addPropertyToClass(fmmlxClass, property);
            }
        }
        catch (error) {
            this._rollbackTransaction();
            throw error;
        }
        this._commitTransaction(transId);
    }

    /**
     * Creates an FMMLx class member and associates it to an fmmlx class
     * @param {String} fmmlxClassId
     * @param {String} name
     * @param {String} type
     * @param {String} intrinsicness
     * @param {String} isOperation
     * @param {String} isObtainable
     * @param {String} isDerivable
     * @Param {String} isSimulated
     * @Param {String} isValue
     * @param {String} value
     * @param {String} operationBody
     */
    createMember(fmmlxClassId, name, type, intrinsicness, isOperation, isObtainable, isDerivable, isSimulation, isValue, value = null, operationBody = null) {
        let fmmlxClass = this._model.findNodeDataForKey(fmmlxClassId);

        let behaviors = [];
        if (isObtainable.length > 0) behaviors.push(isObtainable);
        if (isDerivable.length > 0) behaviors.push(isDerivable);
        if (isSimulation.length > 0) behaviors.push(isSimulation);

        let property = new Model.FmmlxProperty(name, type, intrinsicness, Boolean(isOperation), behaviors, operationBody);
        this.addPropertyToClass(fmmlxClass, property);

        if (Boolean(isValue)) this.addValueToClass(fmmlxClass, value);
    }

    /**
     * Deletes an Fmmlx Class and its references
     * @todo set parent class = null on subclasses
     * @param {String} id
     */
    deleteFmmlxClass(id) {
        /**
         *
         * @type {Model.FmmlxClass}
         */
        let fmmlxClass = this._model.findNodeDataForKey(id);
        console.log(`Deleting class ${fmmlxClass.name}`);
        let transId = this._beginTransaction();
        try {
            for (let instance in fmmlxClass.instances) {
                this.changeMetaclass(instance, null);
            }
            for (let subclass in fmmlxClass.subclasses) {
                //do something
            }
            let node = this._diagram.findNodeForKey(id);
            this._diagram.remove(node);
            this._model.removeNodeData(fmmlxClass);
        }
        catch (error) {
            this._rollbackTransaction();
            throw error;
        }
        this._commitTransaction(transId);
    }

    /**
     *
     * @param {Model.FmmlxClass} fmmlxClass
     */
    deleteMetaclass(fmmlxClass) {
        if (fmmlxClass.metaclass === null) return;
        console.log(`Removing old Metaclass from ${fmmlxClass.name}`);
        let transId = this._beginTransaction();
        try {
            this._model.setDataProperty(fmmlxClass, "metaclass", null);
            fmmlxClass.metaclass.removeInstance(fmmlxClass);
            let deletableProperties = fmmlxClass.metaclass.attributes.concat(fmmlxClass.operations);
            for (let property of deletableProperties) {
                this.deletePropertyFromClass(fmmlxClass, property);
            }
        }
        catch (error) {
            this._rollbackTransaction();
            throw error;
        }
        this._commitTransaction(transId);
    }

    deleteProperty(fmmlxClassId, propertyId, upstream) {
        let fmmlxClass = this._model.findNodeDataForKey(fmmlxClassId);
        let property = this._model.findNodeDataForKey(propertyId);
        this.deletePropertyFromClass(fmmlxClass, property, upstream);
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

        let transId = this._beginTransaction();
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
            this._rollbackTransaction();
        }
        this._commitTransaction(transId);
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
        let transId = this._beginTransaction();

        console.log(`${transId} :: Delete Value for ${value.property.name} in ${fmmlxClass.name}`);
        try {
            let array = fmmlxClass.findCorrespondingArray(value);
            value.property.deleteValue(value);
            this._model.removeArrayItem(array, index);
        }
        catch (error) {
            this._rollbackTransaction(transId);
            throw error;
        }
        this._commitTransaction(transId);
        if (this._model.undoManager.transactionLevel > 1) fmmlxClass.lastChangeId = transId;
    }

    editFmmlxClass(id, name, level, isAbstract, metaclassId = null, externalLanguage = null, externalMetaclass = null) {
        /**
         *
         * @type {Model.FmmlxClass}
         */
        let fmmlxClass = this._model.findNodeDataForKey(id);
        metaclassId = (metaclassId === "") ? null : metaclassId;

        if (isAbstract && fmmlxClass.instances.size > 0) throw new Error("Can not make class abstract because it has instances.");

        console.log(`Editing class ${fmmlxClass.name}`);
        let transId = this._beginTransaction();
        try {
            this._model.setDataProperty(fmmlxClass, "isAbstract", Boolean(isAbstract));
            this._model.setDataProperty(fmmlxClass, "name", name);

            if (externalLanguage !== fmmlxClass.externalLanguage) this._model.setDataProperty(fmmlxClass, "externalLanguage", externalLanguage);
            if (externalMetaclass !== fmmlxClass.externalMetaclass) this._model.setDataProperty(fmmlxClass, "externalMetaclass", externalMetaclass);
            this.changeClassLevel(fmmlxClass, level);
            this.changeMetaclass(fmmlxClass, metaclassId);
            this._model.setDataProperty(fmmlxClass, "lastChangeId", transId);
        }
        catch (error) {
            this._rollbackTransaction();
            throw error;
        }
        this._commitTransaction(transId);
    }

    /**
     * Finds all classes that are level +1
     * @param level
     * @return {Array.<Model.FmmlxClass>}
     */
    getClassesbyLevel(level) {

        let targetLevel = (level !== "?") ? Number.parseInt(level) + 1 : "?";
        return this._filterClasses({level: targetLevel});
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
        }
        else if (property.intrinsicness === fmmlxClass.level && property.intrinsicness !== "?") { // if intrinsicness = level: the property gets deleted +  a value is created
            this.deletePropertyFromClass(fmmlxClass, property);
            this.addValueToClass(fmmlxClass, property);
        }
        else { //if instrisicness < level: if there is a value its gets deleted and the property gets added
            let val = fmmlxClass.findValueFromProperty(property);
            if (val !== null) this.deleteValueFromClass(fmmlxClass, val);
            this.addPropertyToClass(fmmlxClass, property);
        }
    }


};
