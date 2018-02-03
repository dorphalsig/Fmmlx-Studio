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
     * @param {string[]} tags
     */
    constructor(name = "", type = "", intrinsicness = 0, isOperation = false, behaviors = [], operationBody = null, tags = []) {
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
        this.tags = new Set(tags);
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

    get isValue() {
        return false;
    }

    /**
     * Adds an FMMLx Class to the set. Recalculates max intrinsicness
     * @param {Model.FmmlxClass} fmmlxClass
     */
    addClass(fmmlxClass) {
        this.classes.add(fmmlxClass);
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
     * Returns a flat copy of the property
     * @return {Model.FmmlxProperty}
     */
    deflate() {
        /**
         *
         * @type {Model.FmmlxProperty}
         */
        let clone = Object.assign({}, this);
        delete clone.classes;
        delete clone.values;
        delete clone.intrinsicness;
        clone.intrinsicness = clone._intrinsicness;
        clone.isValue = false;
        clone.tags = Array.from(this.tags);
        delete clone._intrinsicness;
        delete clone.values;
        delete clone.classes;
        return clone;
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

    /**
     * Inflates a flattened member
     * @param flatMember
     * @return {Model.FmmlxProperty}
     */
    static inflate(flatMember) {
        let partial = new Model.FmmlxProperty(flatMember.name, flatMember.type, flatMember.intrinsicness, flatMember.isOperation, flatMember.behaviors, flatMember.operationBody, flatMember.tags);
        partial.id = flatMember.id;
        return partial;
    }


};