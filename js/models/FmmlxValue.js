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

        this.value = value;
        this.class = fmmlxClass;
        this.id = Helper.Helper.uuid4();
        return new Proxy(property, this);
    }

    /**
     *
     * @param {Model.FmmlxValue} obj
     * @param property {Model.FmmlxProperty}
     */
    equals(obj) {
        return this.class.equals(obj.class) && this.property.equals(obj.property);
    }

    get(target, name) {
        switch (name) {

            case "equals":
                return this.equals;
                break;

            case "constructor":
                return this.constructor;
                break;

            case "class":
                return this.class;
                break;

            case "value":
                return this.value;
                break;

            case "id":
                return target.id + this.class.id;
                break;

            case "isValue":
                return true;
                break;

            case "property":
                return target;
                break;

            default:
                return target[name];
                break;

        }
    }

    getOwnPropertyDescriptor(obj, prop) {
        console.log(obj.constructor);
        return {
            enumerable: true, configurable: true,
        };
    }

    /* ownKeys(target) {
     debugger;
     // return Object.keys(target).concat(Object.keys(this))
     return ;
     }*/

    set(target, name, val) {
        switch (name) {
            case "class":
                if (this.class === null) {
                    this.class = val;
                } else {
                    throw new Error("Cannot replace the class for a value");
                }
                break;
            case "value":
                this.value = val;
                break;
            default:
                target[name] = val;
                break;
        }
        return true;
    }


};






