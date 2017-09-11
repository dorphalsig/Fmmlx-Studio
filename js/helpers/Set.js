"use strict";
if (typeof Helper === "undefined") {
    window.Helper = {};
}

/**
 *
 * @type {Helper.Set|Array}
 */
Helper.Set = class extends Array {

    get size() {
        return super.length;
    }

    /**
     * Adds an item or array to the collection if it doesnt exist. (Comparing it with all others (using obj.equals()) )
     * @param value
     */
    add(value) {
        if (!this.has(value)) {
            super.push(value);
        }
        return this;
    }

    /**
     *
     * @param value
     * @return {*|number}
     */
    findIndex(value) {
        let v = super.findIndex(item => {
            if (item !== null) {
                return (value === item || (typeof value.equals !== "undefined" && typeof value.equals === "function" && value.equals(item)) );
            }
        });
        return v;
    }

    has(value) {
        return this.findIndex(value) !== -1;
    }

    push(value) {
        add(value);
    }

    remove(value) {
        let pos = this.findIndex(value);
        if (pos === -1) {
            return false;
        }
        this.splice(pos, 1);
        return true;
    }

    toArray() {
        return Array.from(this);
    }
};