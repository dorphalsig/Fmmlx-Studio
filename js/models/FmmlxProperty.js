"use strict";
if (typeof Model === "undefined") var Model = {};
/**
 *
 * @type {Model.FmmlxProperty}
 */
Model.FmmlxProperty = class {

    constructor(name, type, intrinsicness, isOperation, operationBody) {
        this.maxIntrinsicness = -1;
        this.name = name;
        this.type = type;
        this.intrinsicness = intrinsicness;
        this.isOperation = isOperation;
        this.operationBody = operationBody;
        this.values = new Helper.Set();
        this.classes = new Helper.Set();
    }

    get intrinsicness() {
        return this._intrinsicness;
    }

    set intrinsicness(val) {
        let numberVal = Number.parseInt(val);
        if (val === "?" && this.maxIntrinsicness !== "?" || isNaN(numberVal) || numberVal > Number.parseInt(this.maxIntrinsicness)) throw new Error(`Invalid intrinsicness for class ${name}`);
        this._intrinsicness = isNaN(numberVal) ? "?" : numberVal;
    }

    get id() {
        let id = {name: this.name, intrinsicness: this.intrinsicness, isOperation: this.isOperation, type: this.type};
        return SparkMD5.hash(JSON.stringify(id), false);
    }

    /**
     * Adds an FMMLx Class to the set. Recalculates max intrinsicness
     * @param {Model.FmmlxClass} fmmlxClass
     */
    addClass(fmmlxClass) {
        let numLevel = Number.parseInt(fmmlxClass.level);
        this.classes.add(fmmlxClass);
        this.maxIntrinsicness = (this.maxIntrinsicness <= numLevel) ? (numLevel - 1) : this.maxIntrinsicness;

        return this;
    }

    /**
     * Removes FMMLx Class from set. Recalculates max intrinsicness
     * @param {Model.FmmlxClass} fmmlxClass
     * @returns {Model.FmmlxProperty}
     */
    deleteClass(fmmlxClass) {
        this.classes.remove(fmmlxClass);
        this.maxIntrinsicness = -1;
        for (let item of this.classes) {
            this.maxIntrinsicness = (this.maxIntrinsicness <= item.intrinsicness) ? (item.intrinsicness - 1) : this.maxIntrinsicness;
        }
    }

    /**
     * Creates an FmmlxValue
     * @param value
     * @return {Model.FmmlxValue}
     */
    createValue(value = null) {
        let valObj = new Model.FmmlxValue(this, value);
        this.values.add(value);
        return valObj;
    }

    deleteValue(value) {
        this.values.remove(value);
    }

    equals(obj) {

        return this.constructor === Model.FmmlxProperty && this.name === obj.name && this.intrinsicness === obj.intrinsicness;
    }
};