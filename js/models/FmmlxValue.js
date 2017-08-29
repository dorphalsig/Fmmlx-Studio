"use strict";
if (typeof Model === "undefined") window.Model = {};
/**
 *
 * @type {Model.FmmlxValue}
 * @param {Model.FmmlxProperty} property
 * @param {*} value
 * @param {Model.FmmlxClass} fmmlxClass
 */
Model.FmmlxValue = class {

    // Instance
    /**
     *
     * @param {Model.FmmlxProperty} property
     * @param {*} value
     * @param {Model.FmmlxClass} fmmlxClass
     */
    constructor(property, value, fmmlxClass = null) {
        this.property = property;
        this.value = value;
        this.class = fmmlxClass;
    }

    get id() {
        let id = {
            className: this.class.name, propertyName: this.property.name, value: this.value
        };
        return SparkMD5.hash(JSON.stringify(id), false);
    }

    /**
     * Two properties are equal if their
     * @param {Model.FmmlxValue} obj
     * @return {boolean}
     */
    equals(obj) {
        let result = (obj.constructor === Model.FmmlxValue && this.property.equals(obj.property));
        if (this.class !== null) result = result && this.class.equals(obj.class);
        else result = result && obj.class === null;
        return result;
    }
};
