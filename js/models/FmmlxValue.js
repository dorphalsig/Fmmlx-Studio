"use strict";
if (typeof Model === "undefined") {
    window.Model = {};
}
/**
 * This is a handler object meant to be used in a proxy
 * @type {Model.FmmlxValue}
 * @param {Model.FmmlxProperty} property
 * @param {*} value
 * @param {Model.FmmlxClass} fmmlxClass
 */
Model.FmmlxValue = class {

    // Instance
    /**
     * Returns a Proxy object that handles the value, the class and the property transparently
     * @param {Model.FmmlxProperty} property
     * @param {String} value
     * @param {Model.FmmlxClass} fmmlxClass
     */
    constructor(property, value, fmmlxClass) {
        Object.defineProperties(this, {
            name: {enumerable: true, configurable: true, get: () => property.name},
            isValue: {enumerable: true, configurable: true, value: true, writable: false},
            id: {enumerable: true, configurable: true, get: () => this.property.id + this.class.id},
            value: {enumerable: true, configurable: true, writable: true, value: value},
            tags: {enumerable: true, configurable: true, writable: true, value: new Set()},
            class: {enumerable: true, configurable: true, writable: false, value: fmmlxClass},
            property: {enumerable: true, configurable: true, writable: false, value: property},

        })
        //return new Proxy(property,this);
    }

    deflate() {
        let clone = this.property.deflate();
        clone.value = this.value;
        clone.isValue = true;
        clone.class = this.class.id;
        clone.property = this.property.id;
        //delete this.property;
        return clone;
    }

    /**
     *
     * @param {Model.FmmlxValue} obj
     * @param property {Model.FmmlxProperty}
     */
    equals(obj) {
        return this.class.equals(obj.class) && this.property.equals(obj.property);
    }
};
