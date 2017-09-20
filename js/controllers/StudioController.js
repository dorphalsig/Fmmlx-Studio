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
        /**
         *
         * @type {go.Diagram | *}
         * @private
         */
        this._diagram = go.GraphObject.make(go.Diagram, div, {
            "undoManager.isEnabled": true, // enable Ctrl-Z to undo and Ctrl-Y to redo
            model: new go.GraphLinksModel(), allowDelete: false
        });

        /**
         * @type {go.GraphLinksModel}
         * @private
         */
        this._model = this._diagram.model;

        window.PIXELRATIO = this._diagram.computePixelRatio();

        this._diagram.nodeTemplateMap.add(`fmmlxClass`, FmmlxShapes.FmmlxClass.shape);
        this._diagram.linkTemplateMap.add(`fmmlxAssociation`, FmmlxShapes.FmmlxAssociation.shape);
        this._diagram.linkTemplateMap.add(`fmmlxInheritance`, FmmlxShapes.FmmlxInheritance.shape);
        //This prevents stuff being created randomly when ppl click on the diagram
        //This is only required because the add class sets the archetype to something else
        this._diagram.addDiagramListener(`PartCreated`, (diagramEvent) => {
            let tool = diagramEvent.diagram.toolManager.clickCreatingTool;
            tool.archetypeNodeData = null;
            tool.isDoubleClick = false;
        });

        this._model.nodeKeyProperty = `id`;
    }

    /**
     * Starts a Transaction and returns he TxID
     * @param {String} msg
     * @return {String}
     * @private
     */
    _beginTransaction(msg) {
        let id = Helper.Helper.uuid4();
        this._diagram.startTransaction(id);
        console.group(`👉 ${id} :: Begin Transaction ${msg}`);
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
        let lvl = (delta === 0) ? "?" : (fmmlxClass.level === "?") ? delta - fmmlxClass.distanceFromRoot : fmmlxClass.level + delta;
        console.log(`Chaninging level of ${fmmlxClass.name} from ${fmmlxClass.level} to ${lvl}`);

        if (fmmlxClass.lastChangeId === transId) {
            console.log("Already processed. Skipping!");
            return;
        }
        this._model.setDataProperty(fmmlxClass, "lastChangeId", transId);

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

        let members = fmmlxClass.attributes.concat(fmmlxClass.operations)
            .concat(fmmlxClass.slotValues)
            .concat(fmmlxClass.operationValues);
        for (let member of members) {
            this.processMember(fmmlxClass, member);
        }

        if (fmmlxClass.instances.length > 0) {
            console.log("Processing instances...");
            for (let instance of fmmlxClass.instances) {
                this._calculateClassLevel(instance, delta, false, transId);
            }
        }

        if (fmmlxClass.subclasses.length > 0) {
            console.log("Processing subclasses...");

            for (let subclass of fmmlxClass.subclasses) {
                this._calculateClassLevel(subclass, delta, true, transId);
            }
        }
    }

    _commitTransaction(transId) {
        this._diagram.commitTransaction(transId);
        console.groupEnd();
        console.log(`✅ ${transId} :: Transaction committed`);
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
                    continue; //
                }
                retVal = retVal && nodeData[filter] === filters[filter];
            }
            return retVal;
        });

    }

    /**
     *
     * @param {go.Part[]} parts
     * @return {Model.FmmlxProperty[]}
     * @private
     */
    _findCommonMembers(parts) {
        parts = [...parts];
        if (parts.length === 1) {
            return parts[0].data.members;
        }

        /**
         *
         * @type {Model.FmmlxClass}
         */
        let base = parts.pop().data;

        return base.members.filter((member) => {
            let common = true;
            for (let part of parts) {
                common = common && part.data.members.some((t) => t.equals(member))
            }
            return common;
        });
    }

    _rollbackTransaction() {
        let id = this._diagram.undoManager.currentTransaction;
        this._diagram.rollbackTransaction();
        console.groupEnd();
        console.warn(`❌ ${id} :: Rolled-back Transaction`);

    }

    abstractClasses() {
        let fmmlxClassNodes = this._diagram.selection.toArray();
        let classLevel = fmmlxClassNodes[0].data.level;
        let partCreatedHandler = function (diagramEvent) {
            diagramEvent.diagram.removeDiagramListener("PartCreated", partCreatedHandler);
            let transId = studio._beginTransaction("Abstracting Selection...");
            try {
                debugger;
                let commonMembers = studio._findCommonMembers(fmmlxClassNodes);
                for (let member of commonMembers) {
                    studio.addMemberToClass(diagramEvent.subject.data, member);
                }
                for (let fmmlxClassNode of fmmlxClassNodes) {
                    if (fmmlxClassNode.data.level !== classLevel) {
                        throw new Error("All classes to be abstracted must have the same level");
                    }
                    studio.changeMetaclass(fmmlxClassNode.data, diagramEvent.subject.data.id)
                }
                studio._commitTransaction(transId);
            } catch (error) {
                studio._rollbackTransaction();
                //                throw error;
            }
        };

        let name = `AbstractClass ${parseInt(Math.random() * 100)}`;
        let level = (classLevel === "?") ? "?" : classLevel + 1;
        this._diagram.addDiagramListener("PartCreated", partCreatedHandler);
        this.addFmmlxClass(name, level, false);
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


        //The next click on the diagram will insert the class
        this._diagram.toolManager.clickCreatingTool.archetypeNodeData = fmmlxClass;
        this._diagram.toolManager.clickCreatingTool.isDoubleClick = false;

        let partCreatedHandler = (e) => {
            e.diagram.removeDiagramListener("PartCreated", partCreatedHandler);
            studio.changeMetaclass(e.subject.data, metaclassId);
        };

        //Step 3 once we have a part instance we add its metaclass
        this._diagram.addDiagramListener("PartCreated", partCreatedHandler);
    }

    /**
     * Adds <Property> to <fmmlxClass> and its descendants (if it does not exist)
     * Returns true if successful false otherwise
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxProperty} member
     * @return {Boolean}
     */
    addMemberToClass(fmmlxClass, member) {
        console.log(`Adding ${member.name} to ${fmmlxClass.name}`);
        //Do nothing if it already exists of if member.intrinsicness >= fmmlxClass.level
        if (fmmlxClass.level <= member.intrinsicness || fmmlxClass.hasMember(member)) {
            console.log(`Member already exists OR intrinsicness >= level. doing nothing`);
            return null;
        }

        let transId = this._beginTransaction(`Adding Member to class...`);
        try {
            this._model.setDataProperty(fmmlxClass, 'lastChangeId', transId);
            let array = fmmlxClass.findCorrespondingArray(member);
            this._model.addArrayItem(array, member);
            member.addClass(fmmlxClass);//;
            this.processMember(fmmlxClass, member);
            this._commitTransaction(transId);
        } catch (error) {
            this._rollbackTransaction();
            throw  error;
        }
    }

    /**
     * Deletes the corresponding member from FmmlxClass and descendants, creates a new value and adds it to the class
     * returns the value or null if nothing was done
     * @param {Model.FmmlxClass}  fmmlxClass
     * @param {Model.FmmlxProperty} member
     * @param {string|Null} value
     * @return {Model.FmmlxValue|null}
     */
    addValueToClass(fmmlxClass, member, value = null) {
        console.log(`Adding a value of ${member.name} to ${fmmlxClass.name}`);

        if ((member.intrinsicness === "?" && fmmlxClass.level === "?") || member.intrinsicness !== fmmlxClass.level) {
            console.log(`Class (${fmmlxClass.name}) level (${fmmlxClass.level}) is different from the member's (${member.name}) intrinsicness (${member.intrinsicness}). Doing nothing`);
            return null;
        }

        let val = member.createValue(fmmlxClass, value);

        if (fmmlxClass.findIndexForValue(val) !== null) {
            console.log(`A value of ${val.name} already exists in ${fmmlxClass.name}. doing Nothing`);
            return null;
        }

        let transId = this._beginTransaction("Adding Value to class...");
        //the member gets deleted from here downwards
        try {
            this._model.setDataProperty(fmmlxClass, 'lastChangeId', transId);
            this.deleteMember(fmmlxClass, val.property);
            let array = fmmlxClass.findCorrespondingArray(val);
            this._model.addArrayItem(array, val);
            this._commitTransaction(transId);
        } catch (error) {
            this._rollbackTransaction();
            throw error;
        }
        return val;
    }

    /**
     * Changes the level of an FMMLx Class, reevaluates its properties and propagates the changes up and downstream
     * @param fmmlxClass
     * @param newLevel
     * @return false if the change was not done, true otherwise
     */
    changeClassLevel(fmmlxClass, newLevel) {
        console.log(`Changing ${fmmlxClass.name}'s level from ${fmmlxClass.level} to ${newLevel}`);
        newLevel = newLevel === "?" ? "?" : Number.parseFloat(newLevel);
        if (newLevel === fmmlxClass.level) {
            console.log("Initial and target levels are the same. Doing nothing.");
            return false;
        }

        let transId = this._beginTransaction("Changing Class level...");
        let delta = isNaN(newLevel) ? 0 : (fmmlxClass.level === "?") ? newLevel + fmmlxClass.distanceFromRoot : newLevel - fmmlxClass.level;
        try {
            this._calculateClassLevel(fmmlxClass, delta, true, transId);
            this._commitTransaction(transId)
        } catch (error) {
            this._rollbackTransaction();
            throw error;
        }
        return true;
    }

    /**
     *  Changes the level of an FMMMLx member, if not possible throws an exception. returns true if successful, false otherwise
     * @param {Model.FmmlxProperty} member
     * @param newIntrinsicness
     * @return {Boolean}
     */
    changeMemberIntrinsicness(member, newIntrinsicness) {
        console.log(`Changing ${member.name} intrinsicness from ${member.intrinsicness} to ${newIntrinsicness}`);
        if (member.intrinsicness.toString() === newIntrinsicness) {
            console.log("Initial and target instrinsicness are the same. Doing nothing.");
            return false;
        }
        let transId = this._beginTransaction("Changing intrinsicness...");
        try {
            this._model.setDataProperty(member, "intrinsicness", newIntrinsicness);
            for (let fmmlxClass of member.classes) {
                this.processMember(fmmlxClass, member);
            }
            this._commitTransaction(transId);
        } catch (e) {
            this._rollbackTransaction();
            throw e;
        }
        return true;
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

        if ((metaclass.level !== `?` && fmmlxClass.level === `?`) && metaclass.level !== fmmlxClass.level + 1) {
            throw new Error(`Metaclass (${metaclass.name}) level must be ${fmmlxClass.level + 1}`);
        }

        console.log(`Change ${fmmlxClass.name}'s metaclass from  ${(fmmlxClass.metaclass === null) ? "Metaclass" : fmmlxClass.metaclass.name} to ${metaclass.name}`);

        if (fmmlxClass.metaclass !== null && fmmlxClass.metaclass.equals(metaclass)) {
            console.log(`Old and new metaclasses are the same. Doing nothing.`);
        }

        let transId = this._beginTransaction("Changing Metaclass...");
        try {
            this.deleteMetaclass(fmmlxClass);
            this._model.setDataProperty(fmmlxClass, "metaclass", metaclass);
            metaclass.addInstance(fmmlxClass);
            let newProperties = metaclass.attributes.concat(fmmlxClass.operations);
            for (let member of newProperties) {
                this.addMemberToClass(fmmlxClass, member);
                this.addValueToClass(fmmlxClass, member);
            }
        } catch (error) {
            this._rollbackTransaction();
            throw error;
        }
        this._commitTransaction(transId);
    }

    /**
     * Copies a member definition to the metaclass
     * @param classId
     * @param memberId
     */
    copyMemberToMetaclass(classId, memberId) {
        /**
         * @type {Model.FmmlxClass}
         */
        let fmmlxClass = this._model.findNodeDataForKey(classId);
        if (fmmlxClass.metaclass === null) throw new Error("Class has no defined metaclass");

        let member = fmmlxClass.findMemberById(memberId);
        this.addMemberToClass(fmmlxClass.metaclass, member);
    }

    /**
     * Copies a member definition to the superclass
     * @param classId
     * @param memberId
     */
    copyMemberToSuperclass(classId, memberId) {
        /**
         * @type {Model.FmmlxClass}
         */
        let fmmlxClass = this._model.findNodeDataForKey(classId);
        if (fmmlxClass.superclass === null) throw new Error("Class has no defined superclass");

        let member = fmmlxClass.findMemberById(memberId);
        this.addMemberToClass(fmmlxClass.superclass, member);
    }

    /**
     *
     * Creates an FMMLx class member and associates it to an fmmlx class
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
     * @param {String} id
     */
    deleteFmmlxClass(id) {
        /**
         *
         * @type {Model.FmmlxClass}
         */
        let fmmlxClass = this._model.findNodeDataForKey(id);

        let transId = this._beginTransaction(`Deleting class ${fmmlxClass.name}`);
        try {
            //inheritance -  instantiation
            for (let instance of fmmlxClass.instances) {
                this.deleteMetaclass(instance);
            }
            for (let subclass of fmmlxClass.subclasses) {
                this.deleteSuperclass(subclass, fmmlxClass)
            }

            if (fmmlxClass.superclass !== null) fmmlxClass.superclass.removeSubclass(fmmlxClass);

            this.deleteMetaclass(fmmlxClass);

            //process own values - members
            for (let value of fmmlxClass.memberValues) {
                this.deleteValueFromClass(fmmlxClass, value);
            }

            for (let member of fmmlxClass.members) {
                this.deleteMember(fmmlxClass, member);
            }

            let node = this._diagram.findNodeForKey(id);
            this._diagram.remove(node);
            this._model.removeNodeData(fmmlxClass);
        } catch (error) {
            this._rollbackTransaction();
            throw error;
        }
        this._commitTransaction(transId);
    }

    /**
     * Deletes <Property> (and/or its corresponding <Value>) from <fmmlxClass>, its predecessors (`upstream`) and descendants (`downstream`)
     * @param {Model.FmmlxClass|String} classOrId
     * @param {Model.FmmlxProperty|String} memberOrId
     * @param {boolean} upstream
     * @param {boolean} downstream
     * @param {boolean} deleteValues
     */
    deleteMember(classOrId, memberOrId, upstream = false, downstream = true, deleteValues = true) {

        let fmmlxClass = typeof classOrId === "string" ? this._model.findNodeDataForKey(classOrId) : classOrId;
        let member = typeof  memberOrId === "string" ? fmmlxClass.findMemberById(memberOrId) : memberOrId;

        console.log(`Delete member ${member.name} (and/or its value) from ${fmmlxClass.name}`);

        //if prop or value do not exist there's nothing to do.
        if (!fmmlxClass.hasMember(member)) {
            console.log(`member ${member.name} (and/or its value) not found in ${fmmlxClass.name}!`);
            return;
        }


        let transId = this._beginTransaction("Deleting member...");

        //Delete member
        try {
            this._model.setDataProperty(fmmlxClass, 'lastChangeId', transId);
            let array = fmmlxClass.findCorrespondingArray(member);
            let index = fmmlxClass.findIndexForMember(member);
            if (index !== null) {
                this._model.removeArrayItem(array, index);
                member.classes.remove(fmmlxClass);
            }

            if (deleteValues) {
                let value = fmmlxClass.findValueFromProperty(member);
                if (value !== null) {
                    this.deleteValueFromClass(fmmlxClass, value)
                }
            }


            //del downstream
            if (downstream) {
                for (let instance of fmmlxClass.instances) {
                    this.deleteMember(instance, member, upstream, downstream, deleteValues);
                }
                for (let subclass of fmmlxClass.subclasses) {
                    this.deleteMember(subclass, member, upstream, downstream, deleteValues);
                }
            }

            //del upstream
            if (upstream) {
                if (fmmlxClass.superclass !== null) {
                    this.deleteMember(fmmlxClass.superclass, member, upstream, downstream, deleteValues);
                }
                if (fmmlxClass.metaclass !== null) {
                    this.deleteMember(fmmlxClass.metaclass, member, upstream, downstream, deleteValues);
                }
            }
        } catch (e) {
            this._rollbackTransaction();
            throw e;
        }
        this._commitTransaction(transId);
    }

    /**
     * Deletes a Class' Metaclass. Returns true if successful, false otherwise
     * @param {Model.FmmlxClass} fmmlxClass
     */
    deleteMetaclass(fmmlxClass) {

        if (fmmlxClass.metaclass === null) {
            return false;
        }
        let transId = this._beginTransaction(`Removing old Metaclass from ${fmmlxClass.name}`);
        try {
            let metaclass = fmmlxClass.metaclass;
            let deletableProperties = metaclass.attributes.concat(metaclass.operations);
            for (let member of deletableProperties) {
                this.deleteMember(fmmlxClass, member);
            }
            this._model.setDataProperty(fmmlxClass, "metaclass", null);
            metaclass.removeInstance(fmmlxClass);
        } catch (error) {
            this._rollbackTransaction();
            throw error;
        }
        this._commitTransaction(transId);
    }

    /**
     * Sets the superclass to null, removes the subclass reference from the superclass, removes inherited members and deletes the link
     * @param {Model.FmmlxClass} subclass
     * @param {Model.FmmlxClass} superclass
     */
    deleteSuperclass(subclassOrId, superclassOrId) {

        let subclass = typeof subclassOrId === "string" ? this._model.findNodeDataForKey(subclassOrId) : subclassOrId;
        let superclass = typeof  superclassOrId === "string" ? this._model.findNodeDataForKey(superclassOrId) : superclassOrId;

        superclass.removeSubclass(subclass);
        for (let member of superclass.members) {
            this.deleteMember(subclass, member);
        }
        subclass.superclass = null;
        let linkData = this._diagram.findLinksByExample({from: subclass.id, to: superclass.id, category: "fmmlxInheritance"}).first().data;
        this._model.removeLinkData(linkData);
    }

    /**
     * Deletes (if exists) <Value> from FmmlxClass
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxValue} value
     */
    deleteValueFromClass(fmmlxClass, value) {
        console.log(`Delete Value of ${value.property.name}:${value.property.type} in ${fmmlxClass.name}`);
        let index = (value !== null) ? fmmlxClass.findIndexForValue(value) : null;
        if (index === null) {
            console.log(`Value not found in class. Doing nothing.`);
            return;
        }

        let transId = this._beginTransaction("Deleting value...");

        try {
            this._model.setDataProperty(fmmlxClass, 'lastChangeId', transId);
            let arrayName = fmmlxClass.findCorrespondingArray(value, true);
            let array = fmmlxClass[arrayName];
            value.property.deleteValue(value);
            this._model.removeArrayItem(array, index);

        } catch (error) {
            this._rollbackTransaction(transId);
            throw error;
        }

        this._commitTransaction(transId);
    }

    /**
     * Edits an FMMLx Class and recalculates its properties
     * @param classId
     * @param name
     * @param level
     * @param isAbstract
     * @param metaclassId
     * @param externalLanguage
     * @param externalMetaclass
     */
    editFmmlxClass(classId, name, level, isAbstract, metaclassId = null, externalLanguage = null, externalMetaclass = null) {

        /**
         *
         * @type {Model.FmmlxClass}
         */
        let fmmlxClass = this._model.findNodeDataForKey(classId);
        console.log(`Editing class ${fmmlxClass.name}`);

        metaclassId = (metaclassId === "") ? null : metaclassId;

        if (isAbstract && fmmlxClass.instances.size > 0) {
            throw new Error("Can not make class abstract because it has instances.");
        }

        let transId = this._beginTransaction("Editing Class...");
        try {
            let originalName = fmmlxClass.name;
            this._model.setDataProperty(fmmlxClass, "isAbstract", Boolean(isAbstract));
            this._model.setDataProperty(fmmlxClass, "name", name);

            if (externalLanguage !== fmmlxClass.externalLanguage) {
                this._model.setDataProperty(fmmlxClass, "externalLanguage", externalLanguage);
            }
            if (externalMetaclass !== fmmlxClass.externalMetaclass) {
                this._model.setDataProperty(fmmlxClass, "externalMetaclass", externalMetaclass);
            }

            //if the level changed the whole chain is refreshed and there is no need to refresh the instances
            //to reflect name changes
            if (!this.changeClassLevel(fmmlxClass, level)) {
                for (let instance of fmmlxClass.instances) {
                    let node = this._diagram.findNodeForData(instance);
                    node.updateTargetBindings();
                }
            }

            this.changeMetaclass(fmmlxClass, metaclassId);
            this._model.setDataProperty(fmmlxClass, "lastChangeId", transId);
        } catch (error) {
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


        let transId = this._beginTransaction(`Edit Member ${member.name}`);

        try {
            for (let prop in otherAttributes) {
                if (member[prop] === otherAttributes[prop]) {
                    continue;
                }
                this._model.setDataProperty(member, prop, otherAttributes[prop]);
            }

            //let collectionName = fmmlxClass.findCorrespondingArray(member, true);
            // node.updateTargetBindings(collectionName);

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

        } catch (e) {
            this._rollbackTransaction(e);
            throw e
        }
        this._commitTransaction(transId);
    }

    fromJSON(jsonData) {
        this._diagram.model = go.Model.fromJson(jsonData);
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

    inheritFromSuperclass(subclassId) {
        let subclass = this._model.findNodeDataForKey(subclassId);
        let handler = function (event) {
            studio._diagram.removeDiagramListener("ObjectSingleClicked", handler);
            let superclass = event.subject.part.data;
            if (typeof superclass.level === "undefined" || superclass.id === subclass.id) throw new Error("Invalid selection");
            if (superclass.level !== subclass.level) throw new Error("Subclass and Superclass must have the same level.");
            let transId = studio._beginTransaction("Creating inheritance");
            try {
                let members = superclass.members;
                for (let member of members) {
                    studio.addMemberToClass(subclass, member);
                }
                studio._model.setDataProperty(subclass, "superclass", superclass);
                superclass.addSubclass(subclass);
                studio._model.addLinkData({from: subclass.id, to: superclass.id, category: "fmmlxInheritance"});
                studio._commitTransaction(transId);
            } catch (e) {
                studio._rollbackTransaction();
                throw e;
            }
        };
        this._diagram.addDiagramListener("ObjectSingleClicked", handler);
    }

    /**
     * Checks what to do with a member in a class:
     *  if intrinsicness > level : the member + its value is deleted
     *  if intrinsicness = level: the member gets deleted +  a value is created
     *  if intrinsicness < level: if there is a value its gets deleted and the member gets added
     *
     *  Then it does the same for each class downstream.
     *
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxProperty} member
     * @param {String} transId
     */
    processMember(fmmlxClass, member, transId = null) {


        let localCommit = false;
        if (transId === null) {
            transId = this._beginTransaction(`Processing Member ${member.name} in class ${fmmlxClass.name}`);
            localCommit = true;
        } else {
            console.log(`Processing Member ${member.name} in class ${fmmlxClass.name}`);
        }

        try {
            //if its already processed do nothing
            if (transId === fmmlxClass.lastChangeId) {
                console.log(`Transaction already processed. Doing nothing.`);
                return;
            }
            this._model.setDataProperty(fmmlxClass, 'lastChangeId', transId);
            let intrinsicness = member.intrinsicness;
            let level = fmmlxClass.level;

            if (intrinsicness > level) { //if intrinsicness > level : the member + its value is deleted
                this.deleteMember(fmmlxClass, member);
            } else if (intrinsicness === level && intrinsicness !== "?") { // if intrinsicness = level: the member gets deleted +  a value is created
                this.deleteMember(fmmlxClass, member, false, true, false);
                this.addValueToClass(fmmlxClass, member);
            } else { //if intrinsicness < level: if there is a value its gets deleted and the member gets added
                let val = "";
                if (member.isValue) {
                    val = member;
                    member = member.property;
                } else {
                    val = fmmlxClass.findValueFromProperty(member);
                }

                if (val !== null) {
                    this.deleteValueFromClass(fmmlxClass, val);
                }
                this.addMemberToClass(fmmlxClass, member);
            }

            //this._model.updateTargetBindings(fmmlxClass);

            for (let instance of fmmlxClass.instances) {
                this.processMember(instance, member, transId);
            }

            for (let subclass of fmmlxClass.subclasses) {
                this.processMember(subclass, member, transId);
            }
            if (localCommit) {
                this._commitTransaction(transId);
            }
        } catch (e) {
            if (localCommit) {
                this._rollbackTransaction();
            }
            throw e;

        }

    }

    toJSON() {
        return this._diagram.model.toJSON();
    }

    toPNG() {
        return this._diagram.makeImageData({
            scale: 1
        });
    }
};
