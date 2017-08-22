"use strict";
if (typeof Helper === "undefined") var Helper = {}

 Helper.Set = class extends Set {
    constructor(value) {
        super(value);
    }


    /**
     * Adds an item or array to the collection by comparing it with all others (using obj.equals())
     * @param value
     */
    add(value) {
        if (!this.has(value)) super.add(value);
        return this;
    }

    delete(value) {
        for (let val of this) {
            if (typeof val.equals === "function" && val.equals(value) || (typeof val === "undefined" && typeof value === "undefined" || val === value || isNaN(val) && isNaN(value))) {
    return super.delete(val);
}
        }
        return false;
    }

    has(value) {
        for (let val of this) {
            if (typeof val.equals === "function" && value.equals === "function") {
                if (val.equals(value)) return true;
            }
            else if ((typeof val === "undefined" && typeof value === "undefined") || (val === value) || (isNaN(val) && isNaN(value))) {
                return true;
            }
        }
        return false;
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
