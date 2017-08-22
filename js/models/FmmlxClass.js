"use strict";
if (typeof Model === "undefined") var Model = {};
/**
 *
 * @type {Model.FmmlxClass}
 */
Model.FmmlxClass = class {
    /**
     * Constructor
     * @param {string} name
     * @param {string} level
     * @param {boolean} isAbstract
     * @param {string} externalLanguage
     * @param {string} externalMetaclass
     */
    constructor(name = "", level = "0", isAbstract = false, externalLanguage = "", externalMetaclass = "") {
        this.externalLanguage = externalLanguage;
        this.name = name;
        this._distanceFromRoot = 0;
        this._lastChangeId = "";
        this._instances = new Helper.Set();
        this._subclasses = new Helper.Set();
        this._properties = new Helper.Set();
        this._values = new Helper.Set();
        this.endpoints = new Helper.Set();
        this.tags = [];
        this.externalMetaclass = externalMetaclass;
        this._metaclass = "";
        this.level = level;
        this.isAbstract = isAbstract;
    };

    /**
     *
     * @returns {number}
     */
    get distanceFromRoot() {
        return this._distanceFromRoot;
    }

    /**
     *
     * @returns {String}
     */
    get id() {
        let id = {
            name: this.name,
            level: this.level,
            externalLanguage: (this.isExternal) ? this.externalLanguage : "",
            metaclass: (this.isExternal) ? this.externalMetaclass : this.metaclass
        };
        return SparkMD5.hash(JSON.stringify(id), false);
    }

    /**
     *
     * @returns {Array.<Model.FmmlxProperty>}
     */
    get attributes() {
        return this._properties.toArray().filter(property => {
            return property.isOperation === false
        })
    }

    /**
     *
     * @returns {Array.<Model.FmmlxProperty>}
     */
    get operations() {
        return this._properties.toArray().filter(property => {
            return property.isOperation === true
        })
    }

    /**
     *
     * @returns {Array.<Model.FmmlxValue>}
     */
    get slotValues() {
        return this._values.toArray().filter(value => {
            return value.property.isOperation === false
        })
    }

    /**
     *
     * @returns {Array.<Model.FmmlxValue>}
     */
    get operationValues() {
        return this._values.toArray().filter(value => {
            return value.property.isOperation === true
        })
    }

    /**
     *
     * @return {Helper.Set}
     */
    get subclasses() {
        return this._subclasses;
    }

    /**
     *
     * @param {Model.FmmlxClass} subclass
     */
    addSubclass(subclass) {
        this._subclasses.add(subclass)
    }

    /**
     *
     * @param {Model.FmmlxClass} subclass
     */
    deleteSubclass(subclass) {
        this._subclasses.delete(subclass);
    }

    /**
     *
     * @param {Model.FmmlxClass} superclass
     */
    set superclass(superclass) {
        if (typeof superclass !== "undefined" && superclass.constructor !== Model.FmmlxClass)
            throw new Error("Metaclass must be an FMMLxClass");

        if (typeof this.externalLanguage !== "undefined")
            throw new Error("Class can not be an external concept");

        if ((superclass.level !== this.level + 1) && ( (superclass.level === "?" || this.level === "?") && this.level !== superclass.level))
            throw new Error(`Invalid classification level for ${superclass.name}. It can not be the supeclass of ${this.name}`)
    }


    /**
     *
     * returns {Helper.Set}
     */
    get properties() {
        if (this._metaclass === "")
            return new Helper.Set();
        return this._properties;
    }

    /**
     *
     * @return {Helper.Set}
     */
    get instances() {
        return this._instances;
    }

    /**
     *
     * @param {Model.FmmlxClass} metaclass
     */
    set metaclass(metaclass) {
        if (metaclass.level !== this.level + 1)
            throw new Error('Metaclass level is invalid');
        this._metaclass = metaclass;
    }

    /**
     *
     * @returns {Model.FmmlxClass}
     */
    get metaclass() {
        return this._metaclass;
    }

    /**
     *
     * @returns {boolean}
     */
    get isExternal() {
        return (this.externalLanguage !== "")
    }

    /**
     *
     * @returns {boolean}
     */
    get hasUnknownLevel() {
        return this.level === "?";
    }

    /**
     *
     * @param {Model.FmmlxProperty} property
     */
    deleteProperty(property) {
        this._properties.delete(property);
    }

    /**
     *
     * @param {Model.FmmlxValue} value
     */
    deleteValue(value) {
        this._values.delete(value)
    }

    /**
     *
     * @param {Model.FmmlxProperty} property
     */
    addProperty(property) {
        this._properties.add(property);
    }

    /**
     * Finds the respective <Value> for <Property> if it exists. Returns null otherwise
     * @param {Model.FmmlxProperty} property
     * @return {null|Model.FmmlxValue}
     */
    findValueFromProperty(property) {
        let val = null;
        for (let value of this._values) {
            if (value.property.equals(property)) {
                val = value;
                break;
            }
        }
        return val;
    }

    /**
     * Determines if a Property or its corresponding value exist
     * @param {Model.FmmlxProperty} property
     * @returns {boolean}
     */
    propertyOrValueExists(property) {
        if (this._properties.has(property))
            return true;
        return this.findValueFromProperty(property) !== null;
    }

    /**
     * For object comparison. Determines an unique identifier based on the content of the obj
     * @returns {boolean}
     */
    equals(obj) {
        let val = obj.constructor === Model.FmmlxClass && this.name === obj.name && this.level === obj.level;

        if (this.isExternal)
            val = val && this.externalLanguage === obj.externalLanguage && this.externalMetaclass === obj.externalMetaclass;
        else if (typeof this.metaclass !== "")
            val = val && this.metaclass.id === obj.metaclass.id;

        return val;
    }

}
