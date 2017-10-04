"use strict";
(typeof Model === "undefined") ? window.Model = {} : null;

Model.FmmlxInheritance = class {
    /**
     *
     * @param {Model.FmmlxClass} subclass
     * @param {Model.FmmlxClass} superclass
     */
    constructor(subclass, superclass) {
        this.id = Helper.Helper.uuid4();
        this.subclass = subclass;
        this.superclass = superclass;
    }

    static get category() {
        return "fmmlxInheritance";
    }

    get category() {
        return Model.FmmlxInheritance.category
    }

    deflate() {
        let clone = {};
        clone.subclass = this.from;
        clone.superclass = this.to;
        clone.id = this.id;
        clone.category = this.category;
        return clone;
    }

    get from() {
        return this.subclass.id;
    }

    get to() {
        return this.superclass.id;
    }
};


