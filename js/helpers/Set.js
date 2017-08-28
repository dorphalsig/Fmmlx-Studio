"use strict";
if (typeof Helper === "undefined") window.Helper = {};

/**
 *
 * @type {Helper.Set|Array}
 */
Helper.Set = class extends Array {

    get size(){
        return super.length;
    }

    push(value){
        add(value);
    }

    delete(value) {
        let pos = this.findIndex(value);
        this._array.slice(pos,1);
    }

    /**
     * Adds an item or array to the collection if it doesnt exist. (Comparing it with all others (using obj.equals()) )
     * @param value
     */
    add(value) {
        if (!this.has(value))
            super.push(value);
        return this;
    }

    findIndex(value) {
        return super.findIndex(item => {
            return (typeof value.equals !== "undefined" && typeof value.equals === "function" && value.equals(item) ) || (value === item);
        });
    }

    has(value) {
        return this.findIndex(value) !== -1;
    }

    toArray() {
        return Array.from(this);
    }
}
;