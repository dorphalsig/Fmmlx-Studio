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
        this.values = new Helpers_Set();
        this.classes = new Helpers_Set();
    }

    set intrinsicness(val) {
        if (val > this.maxIntrinsicness)
            throw new Error(`Invalid intrinsicness for class ${name}`)
        this._intrinsicness = val;
    }

    get intrinsicness() {
        return this._intrinsicness
    }

    /**
     * Adds an FMMLx Class to the set. Recalculates max intrinsicness
     * @param fmmlxClass
     */
    addClass(fmmlxClass) {
        this.classes.add(fmmlxClass);
        this.maxIntrinsicness = (this.maxIntrinsicness <= fmmlxClass.intrinsicness)
            ? (fmmlxClass.intrinsicness - 1) : this.maxIntrinsicness;
        return this;
    }

    /**
     * Removes FMMLx Class from set. Recalculates max intrinsicness
     * @param fmmmlxClass
     * @returns {Model.FmmlxProperty}
     */
    deleteClass(fmmmlxClass) {
        this.classes.remove(fmmmlxClass);
        this.maxIntrinsicness = -1;
        for (let item of this.classes) {
            this.maxIntrinsicness = (this.maxIntrinsicness <= item.intrinsicness)
                ? (item.intrinsicness - 1) : this.maxIntrinsicness;
        }
    }

    addValue(fmmlxClass, value) {
        let valObj = new Model_FmmlxValue(this, value, fmmlxClass);
        this.values.add(value);
        return valObj;
    }

    deleteValue(value) {
        this.values.remove(value);
    }

    get id() {
        let id = {name: this.name, intrinsicness: this.intrinsicness, isOperation: this.isOperation, type: this.type};
        return SparkMD5.hash(JSON.stringify(id),false);
    }


    equals(obj) {

        return this.constructor === Model.FmmlxProperty && this.name === obj.name && this.intrinsicness === obj.intrinsicness
    }
}