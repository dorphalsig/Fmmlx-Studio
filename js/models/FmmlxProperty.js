"use strict";
if (typeof Model === "undefined") {
    window.Model = {};
}

/**
 *
 * @type {Model.FmmlxProperty}
 *
 * @param {Model.FmmlxClass} fmmlxClass
 * @param {String} name
 * @param {String} type
 * @param {Number|NaN} intrinsicness
 * @param {Boolean} isOperation
 * @param {String[]} behaviors
 * @param {String} operationBody
 */

Model.FmmlxProperty = class {

    /**
     * @param {String} name
     * @param {String} type
     * @param {String} intrinsicness
     * @param {Boolean} isOperation
     * @param {String[]} behaviors
     * @param {String} operationBody
     */
    constructor(name = "", type = "", intrinsicness = 0, isOperation = false, behaviors = [], operationBody = null) {
        this.values = new Helper.Set();
        this.classes = new Helper.Set();
        this.id = Helper.Helper.uuid4();
        this.maxIntrinsicness = Infinity;
        this.name = name;
        this.type = type;
        this.intrinsicness = intrinsicness;
        this.isOperation = isOperation;
        this.behaviors = behaviors === null ? [] : behaviors;
        this.operationBody = operationBody;
    }

    get intrinsicness() {
        return this._intrinsicness;
    };

    set intrinsicness(val) {
        let numberVal = Number.parseInt(val);
        if ((val !== "?" && isNaN(numberVal)) || numberVal > Number.parseInt(this.maxIntrinsicness)) {
            throw new Error(`Invalid intrinsicness ${val} for property ${this.name}`);
        }
        this._intrinsicness = (val === "?") ? "?" : numberVal;
    };

    static get isValue() {
        return false;
    }


    /**
     * Adds an FMMLx Class to the set. Recalculates max intrinsicness
     * @param {Model.FmmlxClass} fmmlxClass
     */
    addClass(fmmlxClass) {
        this.classes.add(fmmlxClass);

        if (fmmlxClass.level === "?") {
            this.maxIntrinsicness = "?";
            this.intrinsicness = "?";
        }
        else {
            let level = Number.parseInt(fmmlxClass.level);
            if (this.maxIntrinsicness === Infinity) {
                this.maxIntrinsicness = level;
            }
            else if (this.maxIntrinsicness <= level) {
                this.maxIntrinsicness = level - 1;
            }
        }

        return this;
    }

    /**
     * Creates an FmmlxValue
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {String} value
     * @return {Model.FmmlxValue}
     */
    createValue(fmmlxClass, value = null) {
        let valObj = new Model.FmmlxValue(this, value, fmmlxClass);
        this.values.add(valObj);
        return valObj;
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

    deleteValue(value) {
        this.values.remove(value);
    }

    equals(obj) {
        return this.constructor === Model.FmmlxProperty && this.name === obj.name && this.intrinsicness === obj.intrinsicness;
    }

    static parse(string) {
        let clone = JSON.parse(string);
        let property = new Model.FmmlxProperty();


    }

    stringify() {
        /**
         *
         * @type {Model.FmmlxProperty}
         */
        let clone = Object.assign({}, this);
        clone.classes = [];
        clone.values = [];
        for (let fmmlxClass of this.classes) {
            clone.classes.push(fmmlxClass.id);
        }
        for (let value of this.values) {
            clone.values.push({classId: value.class.id, value: value.value})
        }
        return JSON.stringify(clone);
    }
};