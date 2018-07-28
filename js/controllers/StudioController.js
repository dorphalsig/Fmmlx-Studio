`use strict`;
if (typeof Controller === `undefined`) {
    window.Controller = {};
}

Controller.StudioController = class {

    // Instance
    /**
     *  Constructor, receives the id of the div that's the parent for the GoJS canvas
     *  @constructor
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
         */
        window.diagram = go.GraphObject.make(go.Diagram, div, {
            "undoManager.isEnabled": true,
            // enable Ctrl-Z to undo and Ctrl-Y to redo
            model: new go.GraphLinksModel(),
            allowDelete: false
        });
        window.PIXELRATIO = window.diagram.computePixelRatio();
        window.diagram.nodeTemplateMap.add(Model.FmmlxClass.category, FmmlxShapes.FmmlxClass.shape);
        window.diagram.linkTemplateMap.add(Model.FmmlxAssociation.category, FmmlxShapes.FmmlxAssociation.shape);
        window.diagram.linkTemplateMap.add(`fmmlxInheritance`, FmmlxShapes.FmmlxInheritance.shape);
        window.diagram.model.nodeKeyProperty = `id`;
        window.diagram.model.linkKeyProperty = `id`;

        this._diagram = window.diagram;
        /**
         * @type {go.GraphLinksModel}
         * @private
         */
        this._model = this._diagram.model;
        this.tags = new Set();
    }

    /**
     * returns a list of fmmlx classes that meets each of <filters> criteria
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
                    common = common && part.data.members.some((t) => t.equals(member));
                }
                return common;
            }
        );
    }

    _updateTags(tags) {
        tags.forEach(tag => this.tags.add(tag));
    }

    abstractClasses() {
        let fmmlxClassNodes = this._diagram.selection.toArray();
        let classLevel = fmmlxClassNodes[0].data.level;
        let partCreatedHandler = function (diagramEvent) {
            diagramEvent.diagram.removeDiagramListener("PartCreated", partCreatedHandler);
            let transId = Helper.Helper.beginTransaction("Abstracting Selection...", "AbsSel");
            try {
                let commonMembers = studio._findCommonMembers(fmmlxClassNodes);
                for (let member of commonMembers) {
                    studio.addMemberToClass(diagramEvent.subject.data, member);
                }
                for (let fmmlxClassNode of fmmlxClassNodes) {
                    if (fmmlxClassNode.data.level !== classLevel) {
                        throw new Error("All classes to be abstracted must have the same level");
                    }
                    studio.changeClassMetaclass(fmmlxClassNode.data, diagramEvent.subject.data.id);
                }
                Helper.Helper.commitTransaction(transId);
            } catch (error) {
                Helper.Helper.rollbackTransaction();
                throw error;
            }
        };

        let name = `AbstractClass ${parseInt(Math.random() * 100)}`;
        let level = (classLevel === "?") ? "?" : classLevel + 1;
        this._diagram.addDiagramListener("PartCreated", partCreatedHandler);
        this.createFmmlxClass(name, level, false);
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

        let transId = Helper.Helper.beginTransaction(`Adding Member to class...`, "addMember");
        try {
            if (fmmlxClass.lastChangeId !== transId) {
                this._model.setDataProperty(fmmlxClass, "lastChangeId", transId);
                let array = fmmlxClass.findCorrespondingArray(member);
                if (!array.has(member)) {
                    this._model.addArrayItem(array, member);
                    this._model.addArrayItem(member.classes, fmmlxClass);
                }
                this.processClass(fmmlxClass);
            }

            let downstream = fmmlxClass.instances.concat(fmmlxClass.subclasses);

            for (let aClass of downstream) {
                this.addMemberToClass(aClass, member);
            }

            Helper.Helper.commitTransaction(transId);
        } catch (error) {
            Helper.Helper.rollbackTransaction();
            throw error;
        }
    }

    /**
     * Deletes the corresponding member from FmmlxClass and descendants, creates a new value and adds it to the class
     * returns the value or null if nothing was done
     * @param {Model.FmmlxClass}  fmmlxClass
     * @param {Model.FmmlxProperty} member
     * @param {string} [value]
     * @return {Model.FmmlxValue|null}
     */
    addValueToClass(fmmlxClass, member, value = null) {
        console.log(`Adding a value (${value}) of ${member.name} to ${fmmlxClass.name}`);

        if ((member.intrinsicness === "?" && fmmlxClass.level === "?") || member.intrinsicness !== fmmlxClass.level) {
            console.log(`Class (${fmmlxClass.name}) level (${fmmlxClass.level}) is different from the member's (${member.name}) intrinsicness (${member.intrinsicness}). Doing nothing`);
            return null;
        }


        let transId = Helper.Helper.beginTransaction("Adding Value to class...", "addValue");
        try {

            let val = new Model.FmmlxValue(member, value, fmmlxClass);

            let array = fmmlxClass.findCorrespondingArray(val);
            this.deleteMember(fmmlxClass, member);
            if (!array.has(val)) {
                this._model.addArrayItem(array, val);
                this._model.addArrayItem(member.values, val)
            }

            this._model.setDataProperty(fmmlxClass, "lastChangeId", transId);
            Helper.Helper.commitTransaction(transId);
            return val;
        } catch (error) {
            Helper.Helper.rollbackTransaction();
            throw error;
        }
    }

    /**
     * Changes the level of an FMMLx Class, reevaluates its properties and propagates the changes up and downstream
     * @param fmmlxClass
     * @param newLevel
     * @param transId
     * @return boolean, false if the change was not done, true otherwise
     */
    changeClassLevel(fmmlxClass, newLevel, transId) {

        if (fmmlxClass.lastChangeId === transId)
            return false;

        if (newLevel === fmmlxClass.level) {
            console.log("Initial and target levels are the same. Doing nothing.");
            return false;
        } else if (newLevel < 0)
            throw new Error(`Level would be negative for ${fmmlxClass.name}`);

        console.log(`Changing ${fmmlxClass.name}'s level from ${fmmlxClass.level} to ${newLevel}`);
        let instanceLevel = "?";
        if (newLevel !== "?") {
            newLevel = Number.parseInt(newLevel);
            instanceLevel = newLevel - 1;
        }
        newLevel = newLevel === "?" ? "?" : Number.parseFloat(newLevel);


        /* -- Level change only works downstream
                if (fmmlxClass.metaclass !== null && fmmlxClass.lastChangeId !== transId) {
                    console.log(`Processing metaclass ${fmmlxClass.metaclass.name}...`);
                    this.changeClassLevel(fmmlxClass.metaclass, instanceLevel, transId);
                }


                if (fmmlxClass.superclass !== null && fmmlxClass.lastChangeId !== transId) {
                    console.log(`Processing supeclass... ${fmmlxClass.superclass.name}.`);
                    this.changeClassLevel(fmmlxClass.superclass, newLevel, transId);
                }
                */

        this._model.setDataProperty(fmmlxClass, "level", newLevel);
        this.processClass(fmmlxClass);
        this._model.setDataProperty(fmmlxClass, "lastChangeId", transId);

        if (fmmlxClass.instances.length > 0) {
            console.log("Processing instances...");
            for (let instance of fmmlxClass.instances) {
                this.changeClassLevel(instance, instanceLevel, transId);
            }
        }

        if (fmmlxClass.subclasses.length > 0) {
            console.log("Processing subclasses...");
            let subclasses = fmmlxClass.subclasses.slice(0);
            for (let subclass of subclasses) {
                this.deleteSuperclass(subclass);
            }
        }

        return true;
    }

    /**
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {*} metaclassId
     */
    changeClassMetaclass(fmmlxClass, metaclassId = null) {

        if (metaclassId === null || metaclassId === "") {
            this.deleteMetaclass(fmmlxClass);
            return;
        }

        let metaclass = this._model.findNodeDataForKey(metaclassId);

        if (fmmlxClass.metaclass !== null && fmmlxClass.metaclass.equals(metaclass)) {
            console.log(`Old and new metaclasses are the same. Doing nothing.`);
            return false;
        }
        if (fmmlxClass.isExternal) {
            throw new Error(`External classes can not have a local metaclass`);
        }

        if ((metaclass.level !== `?` && fmmlxClass.level === `?`) && metaclass.level !== fmmlxClass.level + 1) {
            throw new Error(`Metaclass (${metaclass.name}) level must be ${fmmlxClass.level + 1}`);
        }

        console.log(`Change ${fmmlxClass.name}'s metaclass from  ${(fmmlxClass.metaclass === null) ? "Metaclass" : fmmlxClass.metaclass.name} to ${metaclass.name}`);
        let transId = Helper.Helper.beginTransaction("Changing Metaclass...", "changeMeta");
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
            Helper.Helper.rollbackTransaction();
            throw error;
        }
        Helper.Helper.commitTransaction(transId);
    }

    changeClassSuperclass(superclass, subclass) {
        if (superclass === null) {
            console.log("Superclass is null, doing nothing");
            return;
        }
        if (typeof superclass.level === "undefined" || superclass.id === subclass.id)
            throw new Error("Invalid selection");
        if (superclass.level !== subclass.level)
            throw new Error("Subclass and Superclass must have the same level.");
        if (subclass.superclass !== null)
            throw new Error("Subclass already inherits from another class.");

        let transId = Helper.Helper.beginTransaction("Creating inheritance", "inherit");
        try {
            let members = superclass.members;
            for (let member of members) {
                this.addMemberToClass(subclass, member);
            }
            this._model.setDataProperty(subclass, "superclass", superclass);
            superclass.addSubclass(subclass);
            let data = new Model.FmmlxInheritance(subclass, superclass);
            this._model.addLinkData(data);
            Helper.Helper.commitTransaction(transId);
        } catch (e) {
            Helper.Helper.rollbackTransaction();
            throw e;
        }
    }

    /**
     * Copies a member definition to the metaclass
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxProperty} member
     */
    copyMemberToMetaclass(fmmlxClass, member) {
        /**
         * @type {Model.FmmlxClass}
         */
        //let fmmlxClass = this._model.findNodeDataForKey(classId);
        if (fmmlxClass.metaclass === null)
            throw new Error("Class has no defined metaclass");

        //let member = fmmlxClass.findMemberById(memberId);
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
        if (fmmlxClass.superclass === null)
            throw new Error("Class has no defined superclass");

        let member = fmmlxClass.findMemberById(memberId);
        this.addMemberToClass(fmmlxClass.superclass, member);
    }

    /**
     * Creates an association from source to target
     * @param source
     * @param target
     */
    createAssociation(source, target) {
        try {
            let transId = Helper.Helper.beginTransaction(`Associating ${source.name} and ${target.name}`, "assoc");
            let assoc = new Model.FmmlxAssociation(source, target, "association", "0,*", "?", "src", "0,*", "?", "dst");
            this._model.addLinkData(assoc);
            source.addAssociation(assoc);
            target.addAssociation(assoc);
            Helper.Helper.commitTransaction(transId);
        } catch (err) {
            Helper.Helper.rollbackTransaction();
            throw err;
        }
    }

    /**
     * Given an association, creates an instance or a refinement of it
     * @param {Model.FmmlxAssociation} association
     * @param {Model.FmmlxClass} source
     * @param {Model.FmmlxClass} target
     * @param {boolean} isRefinement
     */
    createAssociationInstanceOrRefinement(association, source, target, isRefinement = false) {
        let transId = Helper.Helper.beginTransaction(`Instantiating assoc ${association.name}`, "instantiate");
        try {
            let assoc;
            if (isRefinement) {
                assoc = new Model.FmmlxAssociation(source, target, "Refinement", association.sourceCardinality, association.sourceIntrinsicness, association.sourceRole, association.targetCardinality, association.targetIntrinsicness, association.targetRole, association, null);

            } else {
                assoc = new Model.FmmlxAssociation(source, target, "Instance", association.sourceCardinality, null, association.sourceRole, association.targetCardinality, null, association.targetRole, null, association);
            }
            this._model.addLinkData(assoc);
            source.addAssociation(assoc);
            target.addAssociation(assoc);

            if (isRefinement) {
                association.addRefinement(assoc);
                assoc.primitive = association;
            } else {
                association.addInstance(assoc);
                assoc.metaAssociation = association;
            }

            Helper.Helper.commitTransaction(transId);
        } catch (err) {
            Helper.Helper.rollbackTransaction();
            throw err;
        }
    }

    /**
     * Adds a new FMMLX Class to the diagram
     * @param {string} name
     * @param {string} isAbstract
     * @param {string} metaclassId
     * @param {string} level
     * @param {string} externalLanguage
     * @param {string} externalMetaclass
     * @param {string[]} tags
     * @returns undefined
     */
    createFmmlxClass(name, level, isAbstract, metaclassId = "", externalLanguage, externalMetaclass, tags = []) {

        //Step 1 Search for dupes

        let fmmlxClass = new Model.FmmlxClass(name, level, isAbstract, externalLanguage, externalMetaclass, tags);
        let dupe = this._model.findNodeDataForKey(fmmlxClass.id);
        if (dupe !== null) {
            throw new Error(`An equivalent class definition already exists.`);
        }
        this._updateTags(tags);
        console.log(`Add Class ${name}`);

        //The next click on the diagram will insert the class
        this._diagram.toolManager.clickCreatingTool.archetypeNodeData = fmmlxClass;
        this._diagram.toolManager.clickCreatingTool.isDoubleClick = false;

        let partCreatedHandler = (diagramEvent) => {
                diagramEvent.diagram.removeDiagramListener("PartCreated", partCreatedHandler);
                let tool = diagramEvent.diagram.toolManager.clickCreatingTool;
                tool.archetypeNodeData = null;
                tool.isDoubleClick = true;
                studio.changeClassMetaclass(diagramEvent.subject.data, metaclassId);
            }
        ;

        //Step 3 once we have a part instance we add its metaclass
        this._diagram.addDiagramListener("PartCreated", partCreatedHandler);
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
     * @param {string[]} tags
     */
    createMember(fmmlxClassId, name, type, intrinsicness, isOperation, behaviors, isValue, value = null, operationBody = null, tags = []) {
        let fmmlxClass = this._model.findNodeDataForKey(fmmlxClassId);
        if (Boolean(isValue)) {
            intrinsicness = fmmlxClass.level;
        }

        let member = new Model.FmmlxProperty(name, type, intrinsicness, Boolean(isOperation), behaviors, operationBody, tags);

        this.addMemberToClass(fmmlxClass, member);
        if (Boolean(isValue)) {
            this.addValueToClass(fmmlxClass, member, value);
        }
        this._updateTags(tags);
    }

    /**
     * Deletes and FMMLx Association
     * @param {Model.FmmlxAssociation} association
     */
    deleteAssociation(association) {
        let transId = Helper.Helper.beginTransaction(`Deleting association ${association.name}`, "deleteAssoc");
        try {
            association.source.removeAssociation(association);
            association.target.removeAssociation(association);
            if (association.metaAssociation !== null)
                association.metaAssociation.deleteInstance(association);
            if (association.primitive !== null)
                association.primitive.deleteRefinement(association);
            this._diagram.remove(this._diagram.findLinkForData(association));
            Helper.Helper.commitTransaction(transId);
        } catch (err) {
            Helper.Helper.rollbackTransaction();
            throw err;
        }
    }

    /**
     * Deletes an Fmmlx Class and its references
     * @param {Model.FmmlxClass} fmmlxClass
     */
    deleteFmmlxClass(fmmlxClass) {

        let transId = Helper.Helper.beginTransaction(`Deleting class ${fmmlxClass.name}`, "deleteClass");
        try {
            //inheritance -  instantiation
            for (let instance of fmmlxClass.instances) {
                this.deleteMetaclass(instance);
            }
            for (let subclass of fmmlxClass.subclasses) {
                this.deleteSuperclass(subclass);
            }

            if (fmmlxClass.superclass !== null)
                fmmlxClass.superclass.removeSubclass(fmmlxClass);

            this.deleteMetaclass(fmmlxClass);

            //process own values - members
            for (let value of fmmlxClass.memberValues) {
                this.deleteValueFromClass(fmmlxClass, value);
            }

            for (let member of fmmlxClass.members) {
                this.deleteMember(fmmlxClass, member);
            }

            let node = this._diagram.findNodeForData(fmmlxClass);
            this._diagram.remove(node);
            this._model.removeNodeData(fmmlxClass);
        } catch (error) {
            Helper.Helper.rollbackTransaction();
            throw error;
        }
        Helper.Helper.commitTransaction(transId);
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
        let member = typeof memberOrId === "string" ? fmmlxClass.findMemberById(memberOrId) : memberOrId;

        console.log(`Delete member ${member.name} (and/or its value) from ${fmmlxClass.name}`);

        //if prop or value do not exist there's nothing to do.
        let memberIndex = fmmlxClass.findIndexForMember(member);
        let value = fmmlxClass.findValueFromProperty(member);

        if (memberIndex === null && value === null) {
            console.log(`member ${member.name} (and/or its value) not found in ${fmmlxClass.name}!`);
            return
        }

        let transId = Helper.Helper.beginTransaction("Deleting member...", "deleteMember");

        //Delete member
        try {
            if (memberIndex !== null) {
                let array = fmmlxClass.findCorrespondingArray(member);
                this._model.removeArrayItem(array, memberIndex);

                let classIndex = member.findIndexForClass(fmmlxClass);
                this._model.removeArrayItem(member.classes, classIndex)

            }

            if (deleteValues && value !== null)
                this.deleteValueFromClass(fmmlxClass, value);

            this._model.setDataProperty(fmmlxClass, "lastChangeId", transId);

            //del downstream
            if (downstream) {
                for (let instance of fmmlxClass.instances) {
                    this.deleteMember(instance, member, false, downstream, deleteValues);
                }
                for (let subclass of fmmlxClass.subclasses) {
                    this.deleteMember(subclass, member, false, downstream, deleteValues);
                }
            }

            //del upstream
            if (upstream) {
                if (fmmlxClass.superclass !== null) {
                    this.deleteMember(fmmlxClass.superclass, member, true, downstream, deleteValues);
                }
                if (fmmlxClass.metaclass !== null) {
                    this.deleteMember(fmmlxClass.metaclass, member, true, downstream, deleteValues);
                }
            }
            Helper.Helper.commitTransaction(transId);
        } catch (e) {
            Helper.Helper.rollbackTransaction();
            throw e;
        }

    }

    /**
     * Deletes a Class' Metaclass. Returns true if successful, false otherwise
     * @param {Model.FmmlxClass} fmmlxClass
     */
    deleteMetaclass(fmmlxClass) {

        if (fmmlxClass.metaclass === null) {
            return false;
        }
        let transId = Helper.Helper.beginTransaction(`Removing old Metaclass from ${fmmlxClass.name}`, "deleteMetaclass");
        try {
            let metaclass = fmmlxClass.metaclass;
            let deletableProperties = metaclass.attributes.concat(metaclass.operations);
            for (let member of deletableProperties) {
                this.deleteMember(fmmlxClass, member);
            }
            this._model.setDataProperty(fmmlxClass, "metaclass", null);
            metaclass.removeInstance(fmmlxClass);
        } catch (error) {
            Helper.Helper.rollbackTransaction();
            throw error;
        }
        Helper.Helper.commitTransaction(transId);
    }

    /**
     * Sets the superclass to null, removes the subclass reference from the superclass, removes inherited members and deletes the link
     * @param {Model.FmmlxClass|String} subclassOrId
     */
    deleteSuperclass(subclassOrId) {

        let subclass = typeof subclassOrId === "string" ? this._model.findNodeDataForKey(subclassOrId) : subclassOrId;
        let superclass = subclass.superclass;

        superclass.removeSubclass(subclass);
        for (let member of superclass.members) {
            this.deleteMember(subclass, member);
        }
        subclass.superclass = null;
        let linkData = this._diagram.findLinksByExample({
            from: subclass.id,
            to: superclass.id,
            category: "fmmlxInheritance"
        }).first().data;
        this._model.removeLinkData(linkData);
    }

    /**
     * Deletes (if exists) <Value> from FmmlxClass
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxValue} value
     */
    deleteValueFromClass(fmmlxClass, value) {
        console.log(`Delete Value of ${value.property.name}:${value.property.type} in ${fmmlxClass.name}`);
        let index = (value !== null) ? fmmlxClass.findIndexForMember(value) : null;
        if (index === null) {
            console.log(`Value not found in class. Doing nothing.`);
            return;
        }

        let transId = Helper.Helper.beginTransaction("Deleting value...", "deleteValue");

        try {
            this._model.setDataProperty(fmmlxClass, "lastChangeId", transId);

            //remove value from class
            let array = fmmlxClass.findCorrespondingArray(value);
            //let index = array.findIndex(value);
            this._model.removeArrayItem(array, index);

            //remove value from property
            index = value.property.values.findIndex(value);
            this._model.removeArrayItem(value.property.values, index);

            Helper.Helper.commitTransaction(transId);

        } catch (error) {
            Helper.Helper.rollbackTransaction(transId);
            throw error;
        }

    }

    editAssociation(assocId, name, sourceCardinality, sourceIntrinsicness, sourceRole, targetCardinality, targetIntrinsicness, targetRole) {
        /**
         *
         * @type {Model.FmmlxAssociation}
         */
        let association = this._model.findLinkDataForKey(assocId);
        let transId = Helper.Helper.beginTransaction("Edit Association", "EditAssoc");
        try {
            this._model.setDataProperty(association, "name", name);
            this._model.setDataProperty(association, "sourceCardinality", sourceCardinality);
            this._model.setDataProperty(association, "sourceRole", sourceRole);
            this._model.setDataProperty(association, "sourceIntrinsicness", sourceIntrinsicness);
            this._model.setDataProperty(association, "targetCardinality", targetCardinality);
            this._model.setDataProperty(association, "targetIntrinsicness", targetIntrinsicness);
            this._model.setDataProperty(association, "targetRole", targetRole);
            Helper.Helper.commitTransaction(transId);
        } catch (error) {
            Helper.Helper.rollbackTransaction();
            throw error;
        }

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
     * @param {string[]} tags
     */
    editFmmlxClass(classId, name, level, isAbstract, metaclassId = null, externalLanguage = null, externalMetaclass = null, tags = []) {

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

        let transId = Helper.Helper.beginTransaction("Editing Class...", "editClass");
        try {
            this._model.setDataProperty(fmmlxClass, "isAbstract", Boolean(isAbstract));
            this._model.setDataProperty(fmmlxClass, "name", name);

            if (externalLanguage !== fmmlxClass.externalLanguage) {
                this._model.setDataProperty(fmmlxClass, "externalLanguage", externalLanguage);
            }
            if (externalMetaclass !== fmmlxClass.externalMetaclass) {
                this._model.setDataProperty(fmmlxClass, "externalMetaclass", externalMetaclass);
            }

            this.changeClassLevel(fmmlxClass, level, transId);
            //if the level changed the whole chain is refreshed and there is no need to refresh the instances
            //to reflect name changes
            /*if (!this.changeClassLevel(fmmlxClass, level)) {
                for (let instance of fmmlxClass.instances) {
                    let node = this._diagram.findNodeForData(instance);
                    node.updateTargetBindings();
                }
            }*/

            this.changeClassMetaclass(fmmlxClass, metaclassId);
            if (!(tags === null || tags.length === 0)) {
                fmmlxClass.tags = new Set(tags);
                tags.forEach(tag => this.tags.add(tag));
            }
            this._model.setDataProperty(fmmlxClass, "lastChangeId", transId);
            Helper.Helper.commitTransaction(transId);
        } catch (error) {
            Helper.Helper.rollbackTransaction();
            throw error;
        }
    }

    /**
     * Edits an FMMLx Attribute/ Operation / Value
     * @param {String} classId
     * @param {String} memberId
     * @param {String} name
     * @param {String} type
     * @param {String} intrinsicness
     * @param {String[]}behaviors
     * @param {String|Null} value
     * @param {String|Null} operationBody
     * @param {string[]} tags
     */
    editMember(classId, memberId, name, type, intrinsicness, behaviors, value = null, operationBody = null, tags = []) {

        let node = this._diagram.findNodeForKey(classId);
        /**
         *
         * @type {Model.FmmlxClass}
         */
        let fmmlxClass = node.data;
        let member = fmmlxClass.findMemberById(memberId);
        let otherAttributes = {
            name: name,
            type: type,
            behaviors: behaviors,
            operationBody: operationBody
        };

        if (member.isValue) {
            otherAttributes = {
                value: value
            };
        }

        let transId = Helper.Helper.beginTransaction(`Edit Member ${member.name}`, "editMember");
        this._updateTags(tags);

        try {
            for (let prop in otherAttributes) {
                if (member[prop] === otherAttributes[prop]) {
                    continue;
                }
                this._model.setDataProperty(member, prop, otherAttributes[prop]);
            }

            this._model.setDataProperty(member, "tags", new Set(tags));

            if (!member.isValue && member.intrinsicness !== intrinsicness) {
                this._model.setDataProperty(member, "intrinsicness", intrinsicness);

                //process each class related to the member
                let classes = member.classes.toArray().slice(0);
                let values = Array.from(member.values.values()).slice(0);
                //just in case we make a static clone

                for (let fmmlxClass of classes) {
                    if (fmmlxClass.lastChangeId !== transId) {
                        this.processClass(fmmlxClass);
                        this._model.setDataProperty(fmmlxClass, "lastChangeId", transId);
                    }
                }

                for (let value of values) {
                    let fmmlxClass = value.class;
                    if (fmmlxClass.lastChangeId !== transId) {
                        this.processClass(fmmlxClass);
                        this._model.setDataProperty(fmmlxClass, "lastChangeId", transId);
                    }
                }

            } else if (member.isValue === false) {
                //If the instrinsicness is unchanged, it is necessary to refresh the classes that have the edited member
                for (let fmmlxClass of member.classes) {
                    let arrayName = fmmlxClass.findCorrespondingArray(member, true);
                    this._model.updateTargetBindings(fmmlxClass, arrayName);
                }
            }
        } catch (e) {
            Helper.Helper.rollbackTransaction(e);
            throw e;
        }
        Helper.Helper.commitTransaction(transId);
    }

    /**
     * Given an array of filter objects, proceeds to apply them recursively to each node in the diagram.
     * and return the matching ones
     * filter = [{tags:["tag1","tag2"], levels:["1","2","?"]},...]
     * @param filters {Object[]}
     * @return Object {classes: Set(), associations: Set(), matchingMembers: {}}
     */
    filterModel(filters = []) {

        let realFilters = []
            , matchingClasses = new Set()
            , matchingAssociations = new Set()
            , matchingMembers = new Map();

        //consolidate filters
        realFilters[0] = filters.shift();
        filters.forEach(filter => {
                if (filter.operator === "") {
                    // AND
                    let pos = realFilters.length - 1;
                    realFilters[pos].tags = realFilters[pos].concat(filter.tags);
                    realFilters[pos].levels = realFilters[pos].concat(filter.levels);
                } else
                    realFilters.push(filter);
                //OR
            }
        );

        //evaluate filters

        for (let filter of realFilters) {
            //Evaluate classes and members
            for (let fmmlxClass of this._model.nodeDataArray) {

                //Evaluate class match with filters
                let levelMatch = filter.levels.length === 0 || filter.levels.includes(fmmlxClass.level.toString());
                let tagMatch = filter.tags.length > 0 && fmmlxClass.tags.size > 0;

                for (let tag of fmmlxClass.tags) {
                    if (!tagMatch)
                        break;
                    tagMatch = tagMatch && filter.tags.includes(tag);
                }

                if (tagMatch && levelMatch)
                    matchingClasses.add(fmmlxClass);

                //Evaluate member match with filters
                for (let member of fmmlxClass.members) {
                    let tagMatch = filter.tags.length > 0 && member.tags.size > 0;

                    for (let tag of member.tags) {
                        if (!tagMatch)
                            break;
                        tagMatch = tagMatch && filter.tags.includes(tag);
                    }
                    if (tagMatch) {
                        if (!matchingMembers.has(fmmlxClass))
                            matchingMembers.set(fmmlxClass, new Set());
                        matchingMembers.get(fmmlxClass).add(member);
                    }
                }
            }

            //Evaluate associations
            for (let fmmlxAssociation of this._model.linkDataArray) {
                let tagMatch = filter.tags.length > 0 && fmmlxAssociation.tags.length > 0;

                for (let tag of fmmlxAssociation.tags) {
                    if (!tagMatch)
                        break;
                    tagMatch = tagMatch && filter.tags.includes(tag);
                }

                if (tagMatch)
                    matchingAssociations.add(fmmlxAssociation);
            }
        }
        return {
            classes: matchingClasses,
            members: matchingMembers,
            associations: matchingAssociations
        }
    }

    /**
     * Makes the instances and subclasses of fmmlxClass and their descendants visible if they have <level> level
     * if <level> is not specified, all descendants are shown.
     * @param {Model.FmmlxClass} fmmlxClass
     */
    findDescendants(fmmlxClass) {
        let children = [];

        for (let instance of fmmlxClass.instances) {
            let tmpBranch = this.findDescendants(instance);
            tmpBranch.push(instance);
            children = children.concat(tmpBranch);
        }

        for (let subclass of fmmlxClass.subclasses) {
            let tmpBranch = this.findDescendants(subclass);
            tmpBranch.push(subclass);
            children = children.concat(tmpBranch);
        }
        return children;
    }

    /**
     * Finds the possible Root classes of fmmlxClass and returns the ids in a set
     * The root is defined as the class with highest abstraction level that has metaclass === null
     * @param {Model.FmmlxClass} fmmlxClass
     * @returns {Model.FmmlxClass}
     */
    findRoot(fmmlxClass) {
        let roots = new Helper.Set();

        let metaRoot = (fmmlxClass.metaclass === null) ? fmmlxClass : this.findRoot(fmmlxClass.metaclass);
        roots.add(metaRoot);

        if (fmmlxClass.superclass !== null) {
            let superRoots = this.findRoot(fmmlxClass.superclass);
            for (let superRoot of superRoots) {
                roots.add(superRoot);
            }
        }

        let rootClass = null;
        for (let possibleRoot of roots) {
            //let tmpClass = this._model.findNodeDataForKey(id);
            if (rootClass === null || parseInt(possibleRoot.level) > parseInt(rootClass.level))
                rootClass = possibleRoot;
        }

        return rootClass;
    }

    /**
     * Finds the parent of each class in classes and hides all the rest
     * @param {Model.FmmlxClass[]} selectedClasses
     */
    findTrees(selectedClasses) {
        let chain = [];
        Helper.Helper.setNodesVisibility(false);
        // hides all classes
        for (let selectedClass of selectedClasses) {
            let root = this.findRoot(selectedClass);
            chain.push(root);
            chain = chain.concat(this.findDescendants(root));
        }
        return chain
    }

    /**
     * Returns an array of valid FmmlxClasses for refinement of a relationship.
     * Valid endpoints for *REFINEMENT* are descendants of each endpoint with *minLevel > intrinsicness*
     * Valid endpoints for *INSTANTIATION* are descendants of each endpoint with *minLevel <= intrinsicness*
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {string} intrinsicness
     * @param {boolean} refinement
     */
    findValidRelationshipClasses(fmmlxClass, intrinsicness, refinement) {
        let validClasses = [];

        for (let instance of fmmlxClass.instances) {
            if (intrinsicness === "?" || (refinement && Number.parseInt(instance.level) > Number.parseInt(intrinsicness)) || (!refinement && Number.parseInt(instance.level) <= Number.parseInt(intrinsicness)))
                validClasses.push(instance);
            validClasses = validClasses.concat(this.findValidRelationshipClasses(instance, intrinsicness, refinement));
        }

        for (let subclass of fmmlxClass.subclasses) {
            if (intrinsicness === "?" || (refinement && Number.parseInt(subclass.level) > Number.parseInt(intrinsicness)) || (!refinement && Number.parseInt(subclass.level) <= Number.parseInt(intrinsicness)))
                validClasses.push(subclass);
            validClasses = this.findValidRelationshipClasses(instance, intrinsicness, refinement).concat(validClasses);
        }

        return validClasses;
    }

    fromJSON(jsonData) {
        let transId = Helper.Helper.beginTransaction("Importing JSON", "import");
        try {
            let flatData = JSON.parse(jsonData);

            while (flatData.nodes.length > 0) {
                let level = flatData.nodes.pop();
                if (Array.isArray(level)) {
                    for (let data of level) {
                        let node = this.inflateClass(data.data);
                        node.location = go.Point.parse(data.location);
                    }
                }
            }
            for (let link of flatData.links) {
                if (link.category === Model.FmmlxInheritance.category) {
                    let subclass = this._model.findLinkDataForKey(link.subclass);
                    let superclass = this._model.findLinkDataForKey(link.superclass);
                    this.changeClassSuperclass(superclass, subclass);
                } else if (link.category === Model.FmmlxAssociation.category) {

                    let source = this._model.findNodeDataForKey(link.source);
                    let target = this._model.findNodeDataForKey(link.target);
                    let primitive = (link.primitive !== null) ? this._model.findLinkDataForKey(link.primitive) : null;
                    let metaAssoc = (link.metaAssociation !== null) ? this._model.findLinkDataForKey(link.metaAssociation) : null;
                    let assoc = Model.FmmlxAssociation.inflate(link, source, target, primitive, metaAssoc);
                    this._model.addLinkData(assoc);
                    link.instances.forEach(instance => {
                            /**
                             * @type {Model.FmmlxAssociation}
                             */
                            let assocInstance = this._model.findLinkDataForKey(instance);
                            if (assocInstance !== null) {
                                this._model.setDataProperty(assocInstance, "metaAssoc", assoc);
                                assoc.addInstance(assocInstance);
                            }
                        }
                    );
                    link.refinements.forEach(refinement => {
                            /**
                             * @type {Model.FmmlxAssociation}
                             */
                            let assocRefinement = this._model.findLinkDataForKey(refinement);
                            if (assocRefinement !== null) {
                                this._model.setDataProperty(assocRefinement, "primitive", assoc);
                                assoc.addRefinement(assocRefinement);
                            }
                        }
                    );
                }
            }

            Helper.Helper.commitTransaction(transId);
        } catch (err) {
            Helper.Helper.rollbackTransaction();
            throw err;
        }
    }

    /**
     * Finds all classes that are level +1
     * @param level
     * @return {Array.<Model.FmmlxClass>}
     */
    getClassesByLevel(level) {

        let targetLevel = (level !== "?") ? Number.parseInt(level) + 1 : "?";
        return this._filterClasses({
            level: targetLevel
        });
    }

    /**
     * Inflates an Fmmlx Class that was deflated
     * @param flatClass
     * @return {go.Node}
     */
    inflateClass(flatClass) {
        let transId = Helper.Helper.beginTransaction(`Inflating ${flatClass.name}`, "inflate");
        try {
            /**
             * @type {Model.FmmlxClass}
             */
            let fmmlxClass = Model.FmmlxClass.inflate(flatClass);
            this._model.addNodeData(fmmlxClass);
            this.changeClassMetaclass(fmmlxClass, flatClass.metaclass);
            this._updateTags(flatClass.tags);

            if (flatClass.superclass !== null) {
                let superclass = this._model.findNodeDataForKey(flatClass.superclass);
                this.changeClassSuperclass(superclass, fmmlxClass);
            }

            for (let flatMember of flatClass.members) {
                let member = Model.FmmlxProperty.inflate(flatMember);
                this.addMemberToClass(fmmlxClass, member);
                if (flatMember.tags !== undefined && flatMember.tags.length > 0)
                    this._updateTags(flatMember.tags)
            }

            for (let flatValue of flatClass.values) {
                let member = Model.FmmlxProperty.inflate(flatValue);
                this.addValueToClass(fmmlxClass, member, flatValue.value)
            }

            this._diagram.findNodeForKey(fmmlxClass.id).updateTargetBindings();
            Helper.Helper.commitTransaction(transId);
            return this._diagram.findNodeForKey(fmmlxClass.id);
        } catch (e) {
            Helper.Helper.rollbackTransaction();
            throw e;
        }
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
     */
    processClass(fmmlxClass) {
        console.log(`Processing all members in ${fmmlxClass.name}`);

        let allMembers = fmmlxClass.members.concat(fmmlxClass.memberValues);

        for (let member of allMembers) {
            let intrinsicness = member.intrinsicness;                
            let level = fmmlxClass.level;

            if (intrinsicness > level) {
                //if intrinsicness > level : the member + its value is deleted
                this.deleteMember(fmmlxClass, member);
            } else if (intrinsicness === level && intrinsicness !== "?" && !member.isValue) {
                // if intrinsicness = level: the member gets deleted +  a value is created
                // only if the member is not a value
                this.addValueToClass(fmmlxClass, member);
            } else if (intrinsicness < level && member.isValue) {
                //if intrinsicness < level: if there is a value its gets deleted and the member gets added
                let property = member.property;
                this.deleteValueFromClass(fmmlxClass, member);
                this.addMemberToClass(fmmlxClass, property);
            }
        }

    }

    /**
     * Exports the diagram as JSON
     */
    toJSON() {
        let flatData = {
            nodes: [],
            links: []
        };
        this._diagram.nodes.each((node) => {
                let data = node.data;
                if (data.category === Model.FmmlxClass.category) {
                    if (!Array.isArray(flatData.nodes[data.level]))
                        flatData.nodes[data.level] = [];
                    flatData.nodes[data.level].push({
                        data: data.deflate(),
                        location: go.Point.stringify(node.location)
                    });
                }
            }
        );

        this._diagram.links.each((link) => {
                flatData.links.push(link.data.deflate());
            }
        );

        return JSON.stringify(flatData);
    }

    toPNG() {
        return this._diagram.makeImageData({
            scale: 1,
            background: "rgba(255, 255, 255, 0.8)"
        });
    }
}
;
