"use strict";
if (typeof Model === "undefined") {
    window.Model = {};
}
/**
 *
 * @type {Model.FmmlxClass}
 */
Model.FmmlxClass = class {
    // Instance
    /**
     * Constructor
     * @param {string} name
     * @param {string} level
     * @param {boolean} isAbstract
     * @param {string} externalLanguage
     * @param {string} externalMetaclass
     * @params {string[]} tags
     */
    constructor(name = "", level = "0", isAbstract = false, externalLanguage = null, externalMetaclass = null, tags = []) {

        /**
         * @type Number|String
         */
        Object.defineProperty(this, "level", {
            configurable: false, enumerable: true, get: function () {
                return this._level;
            }, set: function (level) {
                if (level !== "?") {
                    let parsedLevel = Number.parseInt(level);
                    if (isNaN(parsedLevel)) {
                        throw new Error(`Erroneous level ${level} for class ${this.name}`);
                    }
                    this._level = parsedLevel;
                } else {
                    this._level = "?";
                }
            },
        });

        /**
         * @type Helper.Set
         */
        Object.defineProperty(this, "instances", {
            configurable: true, enumerable: true, get: function () {
                return this._instances;
            }, set: function (val) {
                this._instances = val;
            },
        });

        /**
         * @type Number
         */
        Object.defineProperty(this, "distanceFromRoot", {
            configurable: true, enumerable: true, get: function () {
                return this._distanceFromRoot;
            },
        });

        /**
         * @type boolean
         */
        Object.defineProperty(this, "hasUnknownLevel", {
            configurable: true, enumerable: true, get: () => this.level === "?",
        });

        /**
         * @type Model.FmmlxClass
         */
        Object.defineProperty(this, "metaclass", {
            configurable: true, enumerable: true, get: () => this._metaclass, set: (val) => {
                this._distanceFromRoot = (val === null) ? 0 : val.distanceFromRoot + 1;
                this._metaclass = val;
            },
        });

        /**
         * @type String
         */
        Object.defineProperty(this, "metaclassName", {
            configurable: true,
            enumerable: true,
            get: () => this.isExternal ? this.externalMetaclass : this._metaclass === null ? "Metaclass" : this._metaclass.name,
        });

        /**
         * @type boolean
         */
        Object.defineProperty(this, "isExternal", {
            configurable: true, enumerable: true, get: () => this.externalLanguage !== null,
        });

        Object.defineProperty(this, "filteredAttributes", {
            configurable: true,
            enumerable: true,
            get: () => {
                let filtered = false;
            }
        });

        this.metaclass = null;
        this._distanceFromRoot = 0;
        this._instances = new Helper.Set();
        this.subclasses = new Helper.Set();
        this.superclass = null;
        this.name = name;
        this.lastChangeId = "";
        /**
         *
         * @type {Model.FmmlxProperty[]}
         */
        this.attributes = new Helper.Set();
        /**
         *
         * @type {Model.FmmlxProperty[]}
         */
        this.operations = new Helper.Set();
        /**
         *
         * @type {Model.FmmlxValue[]}
         */
        this.slotValues = new Helper.Set();
        /**
         *
         * @type {Model.FmmlxValue[]}
         */
        this.operationValues = new Helper.Set();
        this.associations = new Helper.Set();
        this.externalLanguage = externalLanguage;
        this.externalMetaclass = externalMetaclass;
        this.level = level;
        this.isAbstract = isAbstract;
        this.tags = new Set(tags);
        //let d = new Date(Date.now());
        this.id = Helper.Helper.generateId();

    };

    /**
     *
     * @param {Model.FmmlxAssociation} association
     */
    addAssociation(association) {
        this.associations.add(association);
    }

    /**
     *
     * @param {Model.FmmlxClass} instance
     */
    addInstance(instance) {
        this._instances.add(instance);
    }

    /**
     *
     * @param {Model.FmmlxClass} subclass
     */
    addSubclass(subclass) {
        this.subclasses.add(subclass);
    }

    static get category() {
        return "FmmlxClass";
    }

    get category() {
        return this.constructor.category;
    }

    /**
     * Returns a flattened copy of the object
     * @return {Model.FmmlxClass}
     */
    deflate() {
        /**
         *
         * @type {Model.FmmlxClass}
         */
        let clone = Object.assign({}, this);
        clone.metaclass = (this._metaclass !== null) ? this._metaclass.id : null;
        clone.superclass = (this.superclass !== null) ? this.superclass.id : null;
        clone.subclasses = [];
        clone.instances = [];
        clone.members = [];
        clone.values = [];

        for (let subclass of this.subclasses) {
            clone.subclasses.push(subclass.id);
        }
        for (let instance of this._instances) {
            clone.instances.push(instance.id);
        }
        for (let member of this.members) {
            clone.members.push(member.deflate());
        }
        for (let value of this.memberValues) {
            clone.values.push(value.deflate());
        }
        for (let attributeName in clone) {
            if (attributeName[0] === "_") delete clone[attributeName];
        }
        clone.tags = Array.from(this.tags);

        delete clone.attributes;
        delete clone.operations;
        delete clone.slotValues;
        delete clone.operationValues;
        delete clone.associations;

        return clone;
    }

    /**
     * For object comparison. Determines an unique identifier based on the content of the obj
     * @returns {boolean}
     */
    equals(obj) {
        let val = obj.constructor === Model.FmmlxClass && this.name === obj.name && this.level === obj.level;

        if (this.isExternal) {
            val = val && this.externalLanguage === obj.externalLanguage && this.externalMetaclass === obj.externalMetaclass;
        } else if (typeof this.metaclass !== "undefined" && this.metaclass !== null) {
            val = val && this.metaclass.id === obj.metaclass.id;
        }

        return val;
    }

    /**
     *  returns the appropriate array for a member or value. Ie. if its an attribute returns a ref to the attribute array.
     *  if returnName is true, returns the name as a String.
     * @param {Model.FmmlxProperty|Model.FmmlxValue} member
     * @param {Boolean} returnName
     * @return {Model.FmmlxProperty[]|Model.FmmlxValue|String}
     */
    findCorrespondingArray(member, returnName = false) {
        if (member.constructor === Model.FmmlxProperty) {
            if (member.isOperation) {
                return (returnName) ? "operations" : this.operations;
            } else {
                return (returnName) ? "attributes" : this.attributes;
            }
        }
        if (member.isOperation) {
            return (returnName) ? "operationValues" : this.operationValues;
        } else {
            return (returnName) ? "slotValues" : this.slotValues;
        }
    }

    /**
     * returns the corresponding index of an Attribute or Operation, or null if not found
     * @param property
     * @return {null|number}
     */
    findIndexForMember(property) {
        let array = this.findCorrespondingArray(property);
        let index = array.findIndex(property);
        return index !== -1 ? index : null;
    }

    /**
     * Returns the attribute/operation/*value with the specified id
     * @param memberId
     * @return {Model.FmmlxProperty|Model.FmmlxValue}
     */
    findMemberById(memberId) {
        let members = this.attributes.concat(this.operations).concat(this.slotValues).concat(this.operationValues);
        return members.filter(member => member.id === memberId)[0];
    }

    /**
     * Finds the respective <Value> for <Member> if it exists. Returns null otherwise
     * @param {Model.FmmlxProperty} property
     * @return {null|Number}
     */
    findValueFromProperty(property) {
        let values = (property.isOperation) ? this.operationValues : this.slotValues;

        for (value of values) {
            if (value.property.equals(property))
                return value;
        }

        return null;
    }

    /**
     * Determines if a Member or its corresponding value exist
     * @param {Model.FmmlxProperty} member
     * @returns {boolean}
     */
    hasMember(member) {
        let index = this.findIndexForMember(member);
        if (index !== null) {
            return true;
        }

        if (member.constructor === Model.FmmlxProperty) {
            return this.findValueFromProperty(member) !== null;
        }

        return false;
    }

    /**
     * Returns a partially inflated copy of a flattened class
     * @param flatClass
     * @return Model.FmmlxClass
     */
    static inflate(flatClass) {
        let partial = new Model.FmmlxClass(flatClass.name, flatClass.level, flatClass.isAbstract, flatClass.externalLanguage, flatClass.externalMetaclass, flatClass.tags);
        partial.id = flatClass.id;
        return partial;
    }

    /**
     * Checks whether a class is a descendant of another class
     * @param {Model.FmmlxClass} fmmlxClass
     * @return {Boolean}
     */
    isDescendantOf(fmmlxClass) {
        let isDescendant = false;
        while (!isDescendant) {
            if (this._metaclass !== null) {
                isDescendant = this._metaclass.equals(fmmlxClass) ? true : this._metaclass.isDescendantOf(fmmlxClass);
            }

            if (!isDescendant && this.superclass !== null) {
                isDescendant = this.superclass.equals(fmmlxClass) ? true : this.superclass.isDescendantOf(fmmlxClass);
            }


        }

    }

    /**
     *
     * @return {Array.<Model.FmmlxProperty>}
     */
    get memberValues() {
        return this.slotValues.concat(this.operationValues);
    }

    /**
     *
     * @return {Array.<Model.FmmlxProperty>}
     */
    get members() {
        return this.attributes.concat(this.operations);
    }

    /**
     *
     * @param {Model.FmmlxAssociation} association
     * @return {*}
     */
    removeAssociation(association) {
        return this.associations.remove(association);
    }

    /**
     *
     * @param {Model.FmmlxClass} instance
     */
    removeInstance(instance) {
        this._instances.remove(instance);
    }

    /**
     *
     * @param {Model.FmmlxClass} subclass
     */
    removeSubclass(subclass) {
        this.subclasses.remove(subclass);
    }


};
