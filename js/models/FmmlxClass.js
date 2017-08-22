"use strict";
if (typeof Model === "undefined") var Model = {};

Model.FmmlxClass = class {
    /**
     * Constructor
     * @param {string} name
     * @param {string} level
     * @param {boolean} isAbstract
     * @param {string} externalLanguage
     * @param {string} externalMetaclass
     */
    constructor(name = "", level = 0, isAbstract = false, externalLanguage = "", externalMetaclass = "") {
        this.externalLanguage = externalLanguage;
        this.level= level;
        this.name = name;
        this.isAbstract = isAbstract;
        this.distanceFromRoot = 0;
        this.lastChangeId = "";
        this.instances = new Helper.Set();
        this.subclasses = new Helper.Set();
        this.properties = new Helper.Set();
        this.values = new Helper.Set();
        this.endpoints = new Helper.Set();
        this.tags = [];
        this.externalMetaclass = externalMetaclass;
        this.metaclass = "";
        this.level = level
    };

    get id() {
        let id = {
            name: this.name,
            level: this.level,
            externalLanguage: (this.isExternal) ? this.externalLanguage : "",
            metaclass: (this.isExternal) ? this.externalMetaclass : this.metaclass
        }
        return SparkMD5.hash(JSON.stringify(id));
    }


    get attributes() {
        return this.properties.toArray().filter(property => {
            return property.isOperation === false
        })
    }

    get operations() {
        return this.properties.toArray().filter(property => {
            return property.isOperation === true
        })
    }

    get slotValues() {
        return this.values.toArray().filter(value => { return value.property.isOperation === false })
    }

    get operationValues() {
        return this.values.toArray().filter(value => { return value.property.isOperation === true })
    }

    set superclass(superclass) {
        if (typeof superclass !== "undefined" && superclass.constructor !== Model.FmmlxClass)
            throw new Error("Metaclass must be an FMMLxClass");

        if (typeof this.externalLanguage !== "undefined")
            throw new Error("Class can not be an external concept");

        if ((superclass.level !== this.level + 1) && ( (superclass.level === "?" || this.level === "?") && this.level !== superclass.level))
            throw new Error(`Invalid classification level for ${superclass.name}. It can not be the supeclass of ${this.name}`)

    }

    get isExternal() {
        return (this.externalLanguage === "")
    }

    get hasUnknownLevel() {
        return level === "?";
    }

    deleteProperty(property) {
        this.properties.delete(property);
    }

    addProperty(property) {
        this.properties.add(property);
    }

    /**
     * For object comparison. Determines an unique identifier based on the content of the obj
     * @returns {*}
     */
    equals(obj) {
        let val = obj.constructor === Model.FmmlxClass && this.name === obj.name && this.level === obj.level;

        if (this.isExternal)
            val = val && this.externalLanguage === obj.externalLanguage && this.externalMetaclass === obj.externalMetaclass;
        else if (typeof this.metaclass !== "")
            val = val && this.metaclass.id === obj.metaclass.id;

        return val;
    }

}