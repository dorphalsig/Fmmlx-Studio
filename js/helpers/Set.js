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
    add(value, force = false) {
        if (force) {
            super.push(value);
            return true;
        }
        let index = this.findIndex(value);
        if (index === -1) {
            super.push(value);
            return true;
        } else {
            this[index] = value;
            return false;
        }
    }

    /**
     *
     * @param item
     * @return {*|number}
     */
    findIndex(item) {
        return super.findIndex(collectionItem => {
            if (collectionItem.equals !== undefined)
                return collectionItem.equals(item);
            else
                return item === collectionItem
        });

    }

    has(value) {
        return this.findIndex(value) !== -1;
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
}
;
