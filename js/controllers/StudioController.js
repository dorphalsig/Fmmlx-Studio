`use strict`;
if (typeof Controller === `undefined`) {
    window.Controller = {};
}

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
            "undoManager.isEnabled": true, // enable Ctrl-Z to undo and Ctrl-Y to redo
            model: new go.GraphLinksModel(),
        });

        this._model = this._diagram.model;

        window.PIXELRATIO = this._diagram.computePixelRatio();

        this._diagram.nodeTemplateMap.add(`fmmlxClass`, FmmlxShapes.FmmlxClass.shape);
        this._diagram.linkTemplateMap.add(`fmmlxAssociation`, FmmlxShapes.FmmlxAssociation.shape);
        //This prevents stuff being created randomly when ppl click on the diagram
        //This is only required because the add class sets the archetype to something else
        this._diagram.addDiagramListener(`PartCreated`, (diagramEvent) => {
            let tool = diagramEvent.diagram.toolManager.clickCreatingTool;
            tool.archetypeNodeData = null;
            tool.isDoubleClick = false;
        });
        //linkTemplates.add(`fmmlxInheritance`, FmmlxShapes.FmmlxInheritance.shape);
        this._model.nodeKeyProperty = `id`;
    }

    /**
     * Starts a Transaction and returns he TxID
     * @return {String}
     * @private
     */
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
    _calculateClassLevel(fmmlxClass, delta, upstream, transId) {
        let lvl = (delta === 0) ? "?" : (fmmlxClass.level === "?") ? fmmlxClass.distanceFromRoot + delta : fmmlxClass.level + delta;
        console.log(`Chaninging level of ${fmmlxClass.name} from ${fmmlxClass.level} to ${lvl}`);

        if (fmmlxClass.lastChangeId === transId) {
            console.log("Already processed. Skipping!");
            return;
        }

        if (upstream) {
            if (fmmlxClass.metaclass !== null) {
                console.log(`Processing metaclass ${fmmlxClass.metaclass.name}...`);
                this._calculateClassLevel(fmmlxClass.metaclass, delta, upstream, transId);
            }
            if (fmmlxClass.superclass !== null) {
                console.log(`Processing supeclass... ${fmmlxClass.superclass.name}.`);
                this._calculateClassLevel(fmmlxClass.superclass, delta, upstream, transId);
            }
        }


        this._model.setDataProperty(fmmlxClass, "level", lvl);

        for (let member of fmmlxClass.attributes.concat(fmmlxClass.operations)) {
            console.log(`processing member ${member.name} in  ${fmmlxClass.name}`);
            let transId2 = this._beginTransaction();
            try {
                this.processMember(fmmlxClass, member, transId2);
                this._model.setDataProperty(fmmlxClass, "lastChangeId", transId2);
            }
            catch (error) {
                this._rollbackTransaction();
                throw error;
            }
        }

        this._model.setDataProperty(fmmlxClass, "lastChangeId", transId);

        if (fmmlxClass.instances.length > 0) {
            console.log("Processing instances...");
            for (let instance of fmmlxClass.instances) {
                this._calculateClassLevel(instance, delta, upstream, transId);
            }
        }

        if (fmmlxClass.subclasses.length > 0) {
            console.log("Processing subclasses...");

            for (let subclass of fmmlxClass.subclasses) {
                this._calculateClassLevel(subclass, delta, upstream, transId);
            }
        }
        this._commitTransaction(transId);
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
                if (!filters.hasOwnProperty(filter) || !nodeData.hasOwnProperty(filter)) {
                    continue;
                }
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
     * @param {string} name
     * @param {string} isAbstract
     * @param {string} metaclassId
     * @param {string} level
     * @param {string} externalLanguage
     * @param {string} externalMetaclass
     * @returns undefined
     */
    addFmmlxClass(name, level, isAbstract, metaclassId = "", externalLanguage, externalMetaclass) {

        //Step 1 Search for dupes

        let fmmlxClass = new Model.FmmlxClass(name, level, isAbstract, externalLanguage, externalMetaclass);
        let dupe = this._model.findNodeDataForKey(fmmlxClass.id);
        if (dupe !== null) {
            throw  new Error(`An equivalent class definition already exists.`);
        }
        console.log(`Add Class ${name}`);

        //Step 2 Add basic info to the model
        fmmlxClass.category = "fmmlxClass";
        this.changeMetaclass(fmmlxClass, metaclassId);

        //The next click on the diagram will insert the class
        this._diagram.toolManager.clickCreatingTool.archetypeNodeData = fmmlxClass;
        this._diagram.toolManager.clickCreatingTool.isDoubleClick = false;
    }

    /**
     * Adds <Property> to <fmmlxClass> and its descendants (if it does not exist)
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxProperty} member
     */
    addMemberToClass(fmmlxClass, member) {
        //Do nothing if it already exists of if member.intrinsicness >= fmmlxClass.level
        if (fmmlxClass.level <= member.intrinsicness || fmmlxClass.hasMember(member)) {
            console.log(`member already exists OR intrinsicness >= level. doing nothing`);
            return;
        }

        console.log(`Adding ${member.name} to ${fmmlxClass.name}`);
        let transId = this._beginTransaction();
        try {
            let array = fmmlxClass.findCorrespondingArray(member);
            this._model.addArrayItem(array, member);
            member.addClass(fmmlxClass);
            if (this._model.undoManager.transactionLevel > 1) {
                fmmlxClass.lastChangeId = transId;
            }
            this.processMember(fmmlxClass, member)
        }
        catch (error) {
            this._rollbackTransaction();
            throw  error;
        }
        this._commitTransaction(transId);
    }

    /**
     * Deletes the corresponding member from FmmlxClass and descendants, creates a new value and adds it
     * @param {Model.FmmlxClass}  fmmlxClass
     * @param {Model.FmmlxProperty} member
     * @param {string|Null} value
     * @return {Model.FmmlxValue}
     */
    addValueToClass(fmmlxClass, member, value = null) {

        if ((member.intrinsicness === "?" && fmmlxClass.level === "?") || member.intrinsicness !== fmmlxClass.level) {
            console.log(`Class (${fmmlxClass.name}) level (${fmmlxClass.level}) is different from the member's (${member.name}) intrinsicness (${member.intrinsicness}). Doing nothing`);
            return;
        }

        let val = member.createValue(value);
        val.class = fmmlxClass;

        if (fmmlxClass.findIndexForValue(val) !== null) {
            console.log(`A value of ${val.name} already exists ${fmmlxClass.name}. doing Nothing`);
            return undefined;
        }
        console.log(`Adding a value of ${val.name} to ${fmmlxClass.name}`);
        let transId = this._beginTransaction();
        //the member gets deleted from here downwards
        this.deleteMemberFromClass(fmmlxClass, val.property);

        try {
            let array = fmmlxClass.findCorrespondingArray(val);
            this._model.addArrayItem(array, val);
            if (this._model.undoManager.transactionLevel > 1) {
                fmmlxClass.lastChangeId = transId;
            }
        }
        catch (error) {
            this._rollbackTransaction();
            throw error;
        }
        this._commitTransaction(transId);
        return val;
    }

    /**
     * Changes the level of an FMMLx Class, reevaluates its properties and propagates the changes up and downstream
     * @param fmmlxClass
     * @param newLevel
     */
    changeClassLevel(fmmlxClass, newLevel) {
        newLevel = newLevel === "?" ? "?" : Number.parseFloat(newLevel);
        if (newLevel === fmmlxClass.level) {
            return;
        }

        let transId = this._beginTransaction();
        let delta = isNaN(newLevel) ? 0 : (fmmlxClass.level === "?") ? newLevel - fmmlxClass.distanceFromRoot : newLevel - fmmlxClass.level;
        try {
            this._calculateClassLevel(fmmlxClass, delta, true, transId);
        }
        catch (error) {
            this._rollbackTransaction();
            throw error;
        }
        this._commitTransaction(transId)
    }

    /**
     *  Changes the level of an FMMMLx member, if not possible throws an exception
     * @param {Model.FmmlxProperty} member
     * @param newLevel
     */
    changeMemberIntrinsicness(member, newLevel) {
        let transId = this._beginTransaction();
        try {
            this._model.setDataProperty(member, "intrinsicness", newLevel);
            for (let fmmlxClass of member.classes) {
                this.processMember(fmmlxClass, member, transId);
            }
            this._commitTransaction(transId);

        }
        catch (e) {
            this._rollbackTransaction();
            throw e;
        }

    }

    /**
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {*} metaclassId
     */
    changeMetaclass(fmmlxClass, metaclassId = null) {
        if (metaclassId === null || metaclassId === "") {
            this.deleteMetaclass(fmmlxClass);
            return;
        }

        if (fmmlxClass.isExternal) {
            throw new Error(`External classes can not have a local metaclass`);
        }

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
            for (let member of newProperties) {
                this.addMemberToClass(fmmlxClass, member);
                this.addValueToClass(fmmlxClass, member);
            }
        }
        catch (error) {
            this._rollbackTransaction();
            throw error;
        }
        this._commitTransaction(transId);
    }

    //Creates an FMMLx class member and associates it to an fmmlx class
    /**
     *
     * @param {String} fmmlxClassId
     * @param {String} name
     * @param {String} type
     * @param {String} intrinsicness
     * @param {String} isOperation
     * @param {String} behaviors
     * @param {String} isValue
     * @param {String} value
     * @param {String} operationBody
     */
    createMember(fmmlxClassId, name, type, intrinsicness, isOperation, behaviors, isValue, value = null, operationBody = null) {
        let fmmlxClass = this._model.findNodeDataForKey(fmmlxClassId);
        if (Boolean(isValue)) {
            intrinsicness = fmmlxClass.level;
        }

        let member = new Model.FmmlxProperty(name, type, intrinsicness, Boolean(isOperation), behaviors, operationBody);
        this.addMemberToClass(fmmlxClass, member);
        if (Boolean(isValue)) {
            this.addValueToClass(fmmlxClass, member, value);
        }
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
            for (let instance of fmmlxClass.instances) {
                this.changeMetaclass(instance, null);
            }
            for (let subclass of fmmlxClass.subclasses) {
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

    deleteMember(fmmlxClassId, propertyId, upstream) {
        let fmmlxClass = this._model.findNodeDataForKey(fmmlxClassId);
        let member = this._model.findNodeDataForKey(propertyId);
        this.deleteMemberFromClass(fmmlxClass, member, upstream);
    }

    /**
     * Deletes <Property> (and/or its corresponding <Value>) from <fmmlxClass>, its predecessors (`upstream`) and descendants (`downstream`)
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxProperty} member
     * @param {boolean} upstream
     * @param {boolean} downstream
     */
    deleteMemberFromClass(fmmlxClass, member, upstream = false, downstream = true) {
        //if prop or value do not exist there's nothing to do.
        if (!fmmlxClass.hasMember(member)) {
            console.log(`member ${member.name} (and/or its value) not found in ${fmmlxClass.name}!`);
            return;
        }

        console.log(`Delete member ${member.name} (and/or its value) from ${fmmlxClass.name}`);
        let transId = this._beginTransaction();


        try {
            //Delete member
            let array = fmmlxClass.findCorrespondingArray(member);
            let index = fmmlxClass.findIndexForMember(member);
            if (index !== null) {
                this._model.removeArrayItem(array, index);
                member.classes.remove(fmmlxClass);
            }

            //Delete Value (if present)
            let value = fmmlxClass.findValueFromProperty(member);
            if (value !== null) {
                this.deleteValueFromClass(fmmlxClass, value);
            }

            // if this is not part of another transaction mark the class as changed
            if (this._model.undoManager.transactionLevel > 1) {
                fmmlxClass.lastChangeId = transId;
            }

            //del downstream
            if (downstream) {
                for (let instance of fmmlxClass.instances) {
                    this.deleteMemberFromClass(instance, member, upstream, downstream);
                }
                for (let subclass of fmmlxClass.subclasses) {
                    this.deleteMemberFromClass(subclass, member, upstream, downstream);
                }
            }

            //del upstream
            if (upstream) {
                if (fmmlxClass.superclass !== null) {
                    this.deleteMemberFromClass(fmmlxClass.superclass, member, upstream, downstream);
                }
                if (fmmlxClass.metaclass !== null) {
                    this.deleteMemberFromClass(fmmlxClass.metaclass, member, upstream, downstream);
                }
            }
        }
        catch (e) {
            this._rollbackTransaction();
            throw e;
        }
        this._commitTransaction(transId);
    }

    /**
     *
     * @param {Model.FmmlxClass} fmmlxClass
     */
    deleteMetaclass(fmmlxClass) {
        if (fmmlxClass.metaclass === null) {
            return;
        }
        console.log(`Removing old Metaclass from ${fmmlxClass.name}`);
        let transId = this._beginTransaction();
        try {
            let metaclass = fmmlxClass.metaclass;
            let deletableProperties = metaclass.attributes.concat(metaclass.operations);
            for (let member of deletableProperties) {
                this.deleteMemberFromClass(fmmlxClass, member);
            }
            this._model.setDataProperty(fmmlxClass, "metaclass", null);
            metaclass.removeInstance(fmmlxClass);
        }
        catch (error) {
            this._rollbackTransaction();
            throw error;
        }
        this._commitTransaction(transId);
    }

    /**
     * Deletes (if exists) <Value> from FmmlxClass
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxValue} value
     */
    deleteValueFromClass(fmmlxClass, value) {

        let index = (value !== null) ? fmmlxClass.findIndexForValue(value) : null;
        if (index === null) {
            console.log(`Value not found in class. Doing nothing.`);
            return;
        }
        let transId = this._beginTransaction();


        console.log(`${transId} :: Delete Value for ${value.property.name}:${value.property.type} in ${fmmlxClass.name}`);
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
        if (this._model.undoManager.transactionLevel > 1) {
            fmmlxClass.lastChangeId = transId;
        }
    }

    editFmmlxClass(id, name, level, isAbstract, metaclassId = null, externalLanguage = null, externalMetaclass = null) {
        /**
         *
         * @type {Model.FmmlxClass}
         */
        let fmmlxClass = this._model.findNodeDataForKey(id);
        metaclassId = (metaclassId === "") ? null : metaclassId;

        if (isAbstract && fmmlxClass.instances.size > 0) {
            throw new Error("Can not make class abstract because it has instances.");
        }

        console.log(`Editing class ${fmmlxClass.name}`);
        let transId = this._beginTransaction();
        try {
            this._model.setDataProperty(fmmlxClass, "isAbstract", Boolean(isAbstract));
            this._model.setDataProperty(fmmlxClass, "name", name);

            if (externalLanguage !== fmmlxClass.externalLanguage) {
                this._model.setDataProperty(fmmlxClass, "externalLanguage", externalLanguage);
            }
            if (externalMetaclass !== fmmlxClass.externalMetaclass) {
                this._model.setDataProperty(fmmlxClass, "externalMetaclass", externalMetaclass);
            }
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
     * Edits an FMmlx Attribute/ Operation / *Value
     * @param {String} classId
     * @param {String} memberId
     * @param {String} name
     * @param {String} type
     * @param {String} intrinsicness
     * @param {String[]}behaviors
     * @param {String|Null} value
     * @param {String|Null} operationBody
     */
    editMember(classId, memberId, name, type, intrinsicness, behaviors, value = null, operationBody = null) {

        let node = this._diagram.findNodeForKey(classId);
        /**
         *
         * @type {Model.FmmlxClass}
         */
        let fmmlxClass = node.data;
        let member = fmmlxClass.findMemberById(memberId);
        let otherAttributes = {name: name, type: type, behaviors: behaviors, operationBody: operationBody};
        if (member.isValue) {
            otherAttributes.value = value;
        }

        console.log(`Edit Member ${member.name}`);

        let transId = this._beginTransaction();

        try {
            //Update data
            for (let prop in otherAttributes) {
                if (!otherAttributes.hasOwnProperty(prop)) {
                    continue;
                }
                this._model.setDataProperty(member, prop, otherAttributes[prop]);
            }

            let collectionName = fmmlxClass.findCorrespondingArray(member, true);
            node.updateTargetBindings(collectionName);

            if (!member.isValue && member.intrinsicness.toString() !== intrinsicness) {
                this.changeMemberIntrinsicness(member, intrinsicness);
            }

            if (!Boolean(member.isValue)) {
                //refresh all classes that contain this
                for (let fmmlxClass of member.classes) {
                    let node = this._diagram.findNodeForKey(fmmlxClass.id);
                    node.updateTargetBindings();
                }
            }

        }
        catch (e) {
            this._rollbackTransaction(e);
            throw e
        }
        this._commitTransaction(transId);
    }

    /**
     * Finds all classes that are level +1
     * @param level
     * @return {Array.<Model.FmmlxClass>}
     */
    getClassesByLevel(level) {

        let targetLevel = (level !== "?") ? Number.parseInt(level) + 1 : "?";
        return this._filterClasses({level: targetLevel});
    }

    /**
     * Checks what to do with a member in a class:
     *  if intrinsicness > level : the member + its value is deleted
     *  if intrinsicness = level: the member gets deleted +  a value is created
     *  if instrisicness < level: if there is a value its gets deleted and the member gets added
     *
     *  Then it does the same for each class downstream.
     *
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxProperty} member
     * @param {String} transId
     */
    processMember(fmmlxClass, member, transId) {
        //if its already processed do nothing
        if (transId === fmmlxClass.lastChangeId) {
            console.log(`Transaction already processed. Doing nothing.`);
            return;
        }

        if (member.intrinsicness > fmmlxClass.level) { //if intrinsicness > level : the member + its value is deleted
            this.deleteMemberFromClass(fmmlxClass, member);
        }
        else if (member.intrinsicness === fmmlxClass.level && member.intrinsicness !== "?") { // if intrinsicness = level: the member gets deleted +  a value is created
            this.deleteMemberFromClass(fmmlxClass, member);
            this.addValueToClass(fmmlxClass, member);
        }
        else { //if instrisicness < level: if there is a value its gets deleted and the member gets added
            let val = fmmlxClass.findValueFromProperty(member);
            if (val !== null) {
                this.deleteValueFromClass(fmmlxClass, val);
            }
            this.addMemberToClass(fmmlxClass, member);
        }

        for (let instance of fmmlxClass.instances) {
            this.processMember(instance, member, transId);
        }

        for (let subclass of fmmlxClass.subclasses) {
            this.processMember(subclass, member, transId);
        }
    }


};
