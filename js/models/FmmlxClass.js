"use strict";
if (typeof Model === "undefined") window, Model = {};
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
        Object.defineProperty(this, 'level', {
            configurable: false,
            enumerable: true,
            get: function () {
                return this._level;
            },
            set: function (level) {
                if (level !== "?") {
                    let parsedLevel = Number.parseInt(level);
                    if (isNaN(parsedLevel)) throw new Error(`Erroneous level ${level} for class ${this.name}`);
                    this._level = parsedLevel;
                }
                else
                    this._level = "?"
            }
        });

        /**
         * @type Helper.Set
         */

        Object.defineProperty(this, 'instances', {
            configurable: true,
            enumerable: true, get: function () {
                return this._instances
            }, set: function (val) {
                this._instances = val;
            }
        });


        /**
         * @type Helper.Set
         */
        Object.defineProperty(this, 'endpoints', {
            configurable: true, enumerable: true, get: function () {
                return this._endpoints
            }
        });


        /**
         * @type Number
         */
        Object.defineProperty(this, 'distanceFromRoot', {
            configurable: true, enumerable: true, get: function () {
                return this._distanceFromRoot
            }
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
        Object.defineProperty(this, 'subclasses', {
            configurable: true, enumerable: true,
            get: function () {
                return this._subclasses;
            }
        });

        /**
         * @type boolean
         */
        Object.defineProperty(this, 'hasUnknownLevel', {
            configurable: true, enumerable: true, get: function () {
                return this.level === "?";
            }
        });


        /**
         * @type Model.FmmlxClass
         */
        Object.defineProperty(this, 'metaclass', {
            configurable: true, enumerable: true, get: function () {
                return this._metaclass
            }, set: function (val) {
                this._distanceFromRoot = (val === null) ? 0 : val.distanceFromRoot + 1;
                this._metaclass = val;
            }
        });

        /**
         * @type String
         */
        Object.defineProperty(this, 'metaclassName', {
            configurable: true, enumerable: true, get: function () {
                return this.isExternal ? this.externalMetaclass : this._metaclass === null ? "Metaclass" : this._metaclass.name;
            }
        });


        /**
         * @type boolean
         */
        Object.defineProperty(this, 'isExternal', {
            configurable: true, enumerable: true, get: function () {
                return (this.externalLanguage !== null);
            }
        });


        this.__foundPropIndex = null;
        this.__foundValIndex = null;
        this.metaclass = null;
        this._distanceFromRoot = 0;
        this._instances = new Helper.Set();
        this._subclasses = new Helper.Set();
        this.superclass = null;
        this.name = name;
        this.attributes = [];
        this.lastChangeId = "";
        this.operations = [];
        this.slotValues = [];
        this.operationValues = [];
        this._endpoints = new Helper.Set();
        this.tags = [];
        this.externalLanguage = externalLanguage;
        this.externalMetaclass = externalMetaclass;
        this.level = level;
        this.isAbstract = isAbstract;
        this.id = Helper.Helper.uuid4();
    };

    /**
     *
     * @param {Model.FmmlxRelationEndpoint} endpoint
     */
    addEndpoint(endpoint) {
        this._endpoints.add(endpoint)
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
        this._subclasses.delete(subclass);
    }

    /**
     * For object comparison. Determines an unique identifier based on the content of the obj
     * @returns {boolean}
     */
    equals(obj) {
        let val = obj.constructor === Model.FmmlxClass && this.name === obj.name && this.level === obj.level;

        if (this.isExternal)
            val = val && this.externalLanguage === obj.externalLanguage && this.externalMetaclass === obj.externalMetaclass;
        else if (typeof this.metaclass !== "undefined")
            val = val && this.metaclass.id === obj.metaclass.id;

        return val;
    }

    /**
     *  returns the appropriate array for a property or value. Ie. if its an attribute returns a ref to the attribute array.
     * @param {Model.FmmlxProperty|Model.FmmlxValue} propOrValue
     * @return
     */
    findCorrespondingArray(propOrValue) {
        if (propOrValue.constructor === Model.FmmlxProperty)
            return (propOrValue.isOperation) ? this.operations : this.attributes;
        return (propOrValue.property.isOperation) ? this.operationValues : this.slotValues;
    }

    /**
     * returns the corresponding index of an Attribute or Operation, or null if not found
     * @param property
     * @return {null|number}
     */
    findIndexForProperty(property) {
        let array = this.findCorrespondingArray(property);
        if (this.__foundPropIndex === null || !array[this.__foundPropIndex].equals(property)) {
            this.hasPropertyOrValue(property);
        }
        return this.__foundPropIndex;
    }

    /**
     * returns the corresponding index of an Attribute or Operation, or null if not found
     * @param value
     * @return {null|number}
     */
    findIndexForValue(value) {
        let array = this.findCorrespondingArray(value);
        if (this.__foundValIndex === null || !array[this.__foundValIndex].equals(value)) {
            this.hasPropertyOrValue(value);
        }
        return this.__foundValIndex;
    }

    /**
     * Finds the respective <Value> for <Property> if it exists. Returns null otherwise
     * @param {Model.FmmlxProperty} property
     * @return {null|Model.FmmlxValue}
     */
    findValueFromProperty(property) {
        let values;

        if (property.isOperation) {
            values = this.operationValues;
        }
        else
            values = this.slotValues;

        let index = values.findIndex(item => {
            return value.equals(item);
        });

        this.__foundValIndex = (index === -1) ? null : index;
        return (index === -1) ? null : values[index];
    }

    /**
     * Determines if a Property or its corresponding value exist
     * @param {Model.FmmlxProperty} propOrValue
     * @returns {boolean}
     */
    hasPropertyOrValue(propOrValue) {
        let correspondingArray = this.findCorrespondingArray(propOrValue);
        let index = correspondingArray.findIndex(item => {
            return value.equals(item);
        });

        this.__foundPropIndex = (index === -1) ? null : index;
        if (index !== -1) return true;

        if (propOrValue.constructor === Model.FmmlxProperty)
            return this.findValueFromProperty(propOrValue) !== null;

        return false;
    }

    /**
     *
     * @param {Model.FmmlxRelationEndpoint} endpoint
     */
    removeEndpoint(endpoint) {
        this._endpoints.remove(endpoint)
    }

    /**
     *
     * @param {Model.FmmlxClass} instance
     */
    removeInstance(instance) {
        this._instances.remove(instance)
    }

};
