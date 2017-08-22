"use strict";
if (typeof Helper === "undefined") window.Helper = {};

Helper.Set = class extends Set {
    constructor(value) {
        super(value);
    }


    /**
     * Adds an item or array to the collection by comparing it with all others (using obj.equals())
     * @param value
     */
    add(value) {
        if (typeof val.equals === "function" && value.equals === "function") {
            if (!this.has(value)) super.add(value);
            return this;
        }
        return super.add(value);
    }

    delete(value) {
        for (let val of super) {
            if (typeof val.equals === "function" && value.equals === "function") {
                if (val.equals(value)) return super.delete(val);
                return false;
            }
            else
                return super.delete(value);
        }
    }

    has(value) {
        for (let val of super) {
            if (typeof val.equals === "function" && value.equals === "function") {
                if (val.equals(value))
                    return true;
                return false;
            }
            else
                return super.has(value);
        }
    }


    isSuperset(subset) {
        for (let elem of subset) {
            if (!this.has(elem)) {
                return false;
            }
        }
        return true;
    }

    union(setB) {
        let union = new Set(this);
        for (let elem of setB) {
            union.add(elem);
        }
        return union;
    }

    intersection(setB) {
        let intersection = new Set();
        for (let elem of setB) {
            if (this.has(elem)) {
                intersection.add(elem);
            }
        }
        return intersection;
    }


    toArray() {
        return Array.from(this)
    }
}
;