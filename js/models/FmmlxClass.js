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
        this.__foundPropIndex = null;
        this.__foundValIndex = null;
        this._metaclass = "";
        this.externalLanguage = externalLanguage;
        this.name = name;
        this._distanceFromRoot = 0;
        this._instances = new Helper.Set();
        this._subclasses = new Helper.Set();
        this.attributes = [];
        this.lastChangeId = "";
        this.operations = [];
        this.slotValues = [];
        this.operationValues = [];
        this.endpoints = new Helper.Set();
        this.tags = [];
        this.externalMetaclass = externalMetaclass;
        this._level = level;
        this.isAbstract = isAbstract;
    };


    set level(level){

        if(level!=="?"){
            let parsedLevel = Number.parseInt(level);
            if(isNaN(parsedLevel)) throw new Error(`Erroneous level ${level} for class ${this.name}`)
            this._level =   parsedLevel;
        }
        else
            this._level ="?"
    }

    get level(){
        return this._level;
    }

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
     * @return {Helper.Set}
     */
    get subclasses() {
        return this._subclasses;
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
            throw new Error(`Invalid classification level for ${superclass.name}. It can not be the supeclass of ${this.name}`);
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
     * @returns {Model.FmmlxClass}
     */
    get metaclass() {
        return this._metaclass;
    }

    /**
     *
     * @param {Model.FmmlxClass} metaclass
     */
    set metaclass(metaclass) {
        if (metaclass.level !== this.level + 1)
            throw new Error("Metaclass level is invalid");
        this._metaclass = metaclass;
    }

    /**
     *
     * @returns {boolean}
     */
    get isExternal() {
        return (this.externalLanguage !== "");
    }

    /**
     *
     * @returns {boolean}
     */
    get hasUnknownLevel() {
        return this.level === "?";
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
     * @param property
     * @return {null|number}
     */
    findIndexForValue(value){
        let array = this.findCorrespondingArray(value);
        if (this.__foundValIndex === null || !array[this.__foundValIndex].equals(value)) {
            this.hasPropertyOrValue(value);
        }
        return this.__foundValIndex;
    }

    /**
     * Determines if a Property or its corresponding value exist
     * @param {Model.FmmlxProperty} property
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

};
