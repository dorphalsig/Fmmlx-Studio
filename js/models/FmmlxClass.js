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
     * @param {*} externalLanguage
     * @param {*} externalMetaclass
     */
    constructor(name = "", level = "0", isAbstract = false, externalLanguage = null, externalMetaclass = null) {

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
                }
                else {
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
         * @type Helper.Set
         */
        Object.defineProperty(this, "endpoints", {
            configurable: true, enumerable: true, get: function () {
                return this._endpoints;
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
         * @type String
         */
        /* Object.defineProperty(this, 'id', {
         configurable: true, enumerable: true, get: function () {
         let id = {
         name: this.name,
         level: this.level,
         externalLanguage: (this.isExternal) ? this.externalLanguage : "",
         metaclass: (this.isExternal) ? this.externalMetaclass : this.metaclass
         };
         return SparkMD5.hash(JSON.stringify(id), false);

         }
         });*/


        /**
         * @type Helper.Set
         */
        Object.defineProperty(this, "subclasses", {
            configurable: true, enumerable: true, get: () => this._subclasses,
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
            configurable: true, enumerable: true, get: () => this.isExternal ? this.externalMetaclass : this._metaclass === null ? "Metaclass" : this._metaclass.name,
        });

        /**
         * @type boolean
         */
        Object.defineProperty(this, "isExternal", {
            configurable: true, enumerable: true, get: () => this.externalLanguage !== null,
        });

        this.__foundPropIndex = null;
        this.__foundValIndex = null;
        this.metaclass = null;
        this._distanceFromRoot = 0;
        this._instances = new Helper.Set();
        this._subclasses = new Helper.Set();
        this.superclass = null;
        this.name = name;
        this.lastChangeId = "";
        /**
         *
         * @type {Model.FmmlxProperty[]}
         */
        this.attributes = [];
        /**
         *
         * @type {Model.FmmlxProperty[]}
         */
        this.operations = [];
        /**
         *
         * @type {Model.FmmlxValue[]}
         */
        this.slotValues = [];
        /**
         *
         * @type {Model.FmmlxValue[]}
         */
        this.operationValues = [];
        this._endpoints = new Helper.Set();
        this.tags = [];
        this.externalLanguage = externalLanguage;
        this.externalMetaclass = externalMetaclass;
        this.level = level;
        this.isAbstract = isAbstract;
        let d = new Date(Date.now());
        this.id = `${this.name} - ${d.getHours()}:${d.getMinutes()}.${d.getSeconds()}`;//Helper.Helper.uuid4();

    };

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
     * @param {Model.FmmlxRelationEndpoint} endpoint
     */
    addEndpoint(endpoint) {
        this._endpoints.add(endpoint);
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
        this._subclasses.add(subclass);
    }

    /**
     *
     * @param {Model.FmmlxClass} subclass
     */
    deleteSubclass(subclass) {
        this._subclasses.remove(subclass);
    }

    /**
     * For object comparison. Determines an unique identifier based on the content of the obj
     * @returns {boolean}
     */
    equals(obj) {
        let val = obj.constructor === Model.FmmlxClass && this.name === obj.name && this.level === obj.level;

        if (this.isExternal) {
            val = val && this.externalLanguage === obj.externalLanguage && this.externalMetaclass === obj.externalMetaclass;
        }
        else if (typeof this.metaclass !== null) {
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
            }
            else {
                return (returnName) ? "attributes" : this.attributes;
            }
        }
        if (member.isOperation) {
            return (returnName) ? "operationValues" : this.operationValues;
        }
        else {
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
        let index = array.findIndex(item => item.equals(property));
        return index !== -1 ? index : null;
    }

    /**
     * returns the corresponding index of an Attribute or Operation, or null if not found
     * @param value
     * @return {null|number}
     */
    findIndexForValue(value) {
        let array = this.findCorrespondingArray(value);
        let index = array.findIndex(item => item.equals(value));
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
     * @return {null|Model.FmmlxValue}
     */
    findValueFromProperty(property) {

        let propertyCollection = this.slotValues;

        if (property.isOperation) {
            propertyCollection = this.operationValues;
        }

        let index = propertyCollection.findIndex(val => val.property.equals(property));
        return (index === -1) ? null : propertyCollection[index];
    }

    /**
     * Determines if a Member or its corresponding value exist
     * @param {Model.FmmlxProperty} member
     * @returns {boolean}
     */
    hasMember(member) {
        let correspondingArray = this.findCorrespondingArray(member);
        let index = correspondingArray.findIndex(item => {
            return member.equals(item);
        });
        if (index !== -1) {
            return true;
        }

        if (member.constructor === Model.FmmlxProperty) {
            return this.findValueFromProperty(member) !== null;
        }

        return false;
    }

    /**
     *
     * @param {Model.FmmlxRelationEndpoint} endpoint
     */
    removeEndpoint(endpoint) {
        this._endpoints.remove(endpoint);
    }

    /**
     *
     * @param {Model.FmmlxClass} instance
     */
    removeInstance(instance) {
        this._instances.remove(instance);
    }


    stringify() {
        /**
         *
         * @type {Model.FmmlxClass}
         */
        let clone = Object.assign({}, this);
        clone.metaclass = (this._metaclass !== null) ? this._metaclass.id : null;
        clone.superclass = (this.superclass !== null) ? this.superclass.id : null;
        clone.subclasses = [];
        clone.instances = [];
        clone.attributes = [];
        clone.operations = [];
        clone.slotValues = [];
        clone.operationValues = [];
        for (let subclass of this._subclasses) {
            clone.subclasses.push(subclass.id);
        }
        for (let instance of this._instances) {
            clone.instances.push(instance.id);
        }
        for (let member of this.members) {
            clone[(member.isOperation) ? "operations" : "attributes"].push(member.stringify());
        }
        for (let value of this.memberValues) {
            clone[(value.isOperation) ? "slotValues" : "operationValues"].push(member.stringify());
        }
        return JSON.stringify(clone);
    }

};
