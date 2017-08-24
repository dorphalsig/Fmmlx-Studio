"use strict";
if (typeof Helper === "undefined") window.Helper = {};

Helper.Set = class {
    constructor(value) {
        this._array = [];
    }


    /**
     * Adds an item or array to the collection if it doesnt exist. (Comparing it with all others (using obj.equals()) )
     * @param value
     */
    add(value) {
        if (!this.has(value))
            this._array.push(value);
        return this;
    }

    delete(value) {
        let pos = this.findIndex(value);
        this._array.slice(pos,1);
    }

    findIndex(value) {
        return this._array.findIndex(item => {
            return (typeof value.equals !== "undefined" && typeof value.equals === "function" && value.equals(item) ) || (value === item);
        });
    }


    has(value) {
        return this.findIndex(value) !== -1;
    }


    toArray() {
        return this._array;
    }
}
;