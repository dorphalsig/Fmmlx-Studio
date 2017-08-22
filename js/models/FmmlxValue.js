"use strict";
if (typeof Model === "undefined") var Model = {};

 Model.FmmlxValue = class{
    constructor(property, value, fmmlxClass) {
        this.property = property;
        this.value = value;
        this.class = fmmlxClass;
    }



    equals(obj) {
        return (obj.constructor === Model.FmmlxValue && this.class.name === obj.class.name && this.property.name === obj.property.name && this.value === obj.value)
    }
}