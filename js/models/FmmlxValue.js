"use strict";
if (typeof Model === "undefined")  window.Model = {};
/**
 *
 * @type {Model.FmmlxValue}
 */
 Model.FmmlxValue = class{
    constructor(property, value, fmmlxClass) {
        this.property = property;
        this.value = value;
        this.class = fmmlxClass;
    }

    get id(){
        let id ={
            className: this.class.name,
            propertyName: this.property.name,
            value: this.value

        };
        return SparkMD5.hash(JSON.stringify(id),false);
    }

    equals(obj) {
        return (obj.constructor === Model.FmmlxValue && this.class.name === obj.class.name && this.property.name === obj.property.name && this.value === obj.value)
    }
}
