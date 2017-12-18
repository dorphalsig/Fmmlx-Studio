"use strict";
if (typeof Model === "undefined") {
    window.Model = {};
}


/**
 * Represents an Association
 * @param {Model.FmmlxClass} source
 * @param {Model.FmmlxClass} target
 * @param {String} name
 * @param {String} cardinality0
 * @param {String} intrinsicness0
 * @param {String} role0
 * @param {String} cardinality1
 * @param {String} intrinsicness1
 * @param {String} role1
 * @param {Model.FmmlxAssociation} primitive
 * @param {Model.FmmlxAssociation} metaAssociation
 * @param {String} id of the association, only useful when inflating a deflated association
 */

Model.FmmlxAssociation = class {


    // Instance
    /**
     * Represents an Association
     * @constructor
     * @param {Model.FmmlxClass} source
     * @param {Model.FmmlxClass} target
     * @param {String} name
     * @param {String} cardinality0
     * @param {String} intrinsicness0
     * @param {String} role0
     * @param {String} cardinality1
     * @param {String} intrinsicness1
     * @param {String} role1
     * @param {Model.FmmlxAssociation} primitive
     * @param {Model.FmmlxAssociation} metaAssociation
     */
    constructor(source, target, name, cardinality0, intrinsicness0, role0, cardinality1, intrinsicness1, role1, primitive = null, metaAssociation = null) {
        this.source = source;
        this.target = target;
        this.name = name;
        this.sourceRole = role0;
        this.targetRole = role1;
        this.primitive = primitive;
        this.metaAssociation = metaAssociation;
        this.sourceCardinality = cardinality0;
        this.targetCardinality = cardinality1;
        this.sourceIntrinsicness = intrinsicness0;
        this.targetIntrinsicness = intrinsicness1;
        this.refinements = new Helper.Set();
        this.instances = new Helper.Set();
        this.id = Helper.Helper.uuid4();
    }

    /**
     * Validates that <cardinality> is a more restrictive cardinality than <reference>
     * @param cardinality
     * @param reference
     * @return {boolean}
     * @private
     */
    _validateCardinality(cardinality, reference) {
        const regex = /(\d+|\*).+?(\d+|\*)/g; //
        let cardArray = regex.exec(cardinality);
        regex.lastIndex = 0;
        let refArray = regex.exec(reference);
        cardArray[0] = cardArray[0] === "*" ? -Infinity : parseInt(cardArray[0]);
        refArray[0] = refArray[0] === "*" ? -Infinity : parseInt(refArray[0]);
        cardArray[1] = cardArray[1] === "*" ? Infinity : parseInt(cardArray[1]);
        refArray[1] = refArray[1] === "*" ? Infinity : parseInt(refArray[1]);
        return cardArray[0] >= refArray[0] && cardArray[1] <= refArray[1];

    }

    /**
     * Validates an intrinsicness value vs a reference.
     * @param intrinsicness
     * @param reference
     * @return boolean
     * @private
     */
    _validateIntrinsicness(intrinsicness, reference) {
        if (reference === "?") return true;
        if (intrinsicness === "?") return false;

        return Number.parseInt(intrinsicness) <= Number.parseInt(reference);
    }

    /**
     *
     * @param {Model.FmmlxAssociation} instance
     */
    addInstance(instance) {
        this.instances.add(instance);
    }

    /**
     *
     * @param {Model.FmmlxAssociation} refinement
     */
    addRefinement(refinement) {
        this.refinements.add(refinement);
    }

    static get category() {
        return "fmmlxAssociation";
    }

    get category() {
        return Model.FmmlxAssociation.category;
    }

    /**
     * Returns a flat JSON representation of the Association state, namely the references to other models (namely FmmlxClass & FmmlxAssociation)
     * are replaced by their respective id
     */
    deflate() {
        let clone = Object.assign({}, this);
        // noinspection JSAnnotator
        delete clone.from;
        // noinspection JSAnnotator
        delete clone.to;
        clone.source = this.source.id;
        clone.target = this.target.id;
        clone.primitive = (this.primitive !== null ) ? this.primitive.id : null;
        clone.metaAssociation = (this.metaAssociation !== null) ? this.metaAssociation.id : null;
        delete clone.sourceIntrinsicness;
        clone.sourceIntrinsicness = this.sourceIntrinsicness;
        delete clone.sourceCardinality;
        clone.sourceCardinality = this.sourceCardinality;
        delete clone.targetIntrinsicness;
        clone.targetIntrinsicness = this.targetIntrinsicness;
        delete clone.targetCardinality;
        clone.targetCardinality = this.targetCardinality;

        let refinements = [];
        for (let refinement of this.refinements) {
            refinements.push(refinement.id);
        }
        clone.refinements = refinements;
        let instances = [];
        for (let instance of this.instances) {
            instances.push(instance.id);
        }
        clone.instances = instances;
        delete clone.category;
        clone.category = this.category;
        return clone;
    }

    /**
     * Removes an instance reference
     * @param instance
     */
    deleteInstance(instance) {
        this.instances.remove(instance)
    }

    /**
     *
     * @param {Model.FmmlxAssociation} refinement
     */
    deleteRefinement(refinement) {
        this.refinements.remove(refinement);
    }

    /**
     *
     * @param obj
     * @returns {boolean}
     */
    equals(obj) {
        let equals = obj.constructor === "Model.FmmlxAssociation" && obj.source.equals(this.source) && obj.target.equals(this.target);
        if (this.isRefinement) {
            equals = equals && this.primitive.equals(obj.primitive);
        } else if (this.isInstance) {
            equals = equals && this.metaAssociation.equals(obj.metaAssociation);
        }

        return equals;
    }

    get from() {
        return this.source.id;
    }

    /**
     *  Inflates a deflated FmmlxAssociation
     * @param {Model.FmmlxAssociation} flatData
     * @param {Model.FmmlxClass} source
     * @param {Model.FmmlxClass} target
     * @param {Model.FmmlxAssociation} primitive
     * @param {Model.FmmlxAssociation} meta
     */
    static inflate(flatData, source, target, primitive, meta) {
        let assoc = new Model.FmmlxAssociation(source, target, flatData.name, flatData.sourceCardinality, flatData.sourceIntrinsicness, flatData.sourceRole, flatData.targetCardinality, flatData.targetIntrinsicness, flatData.targetRole, primitive, meta);
        assoc.id = flatData.id;
        return assoc;
    }

    /**
     *
     * @returns {boolean}
     */
    get isInstance() {
        return this.metaAssociation !== null;
    }

    /**
     *
     * @returns {boolean}
     */
    get isRefinement() {
        return this.primitive !== null;
    }

    get sourceCardinality() {
        return this._sourceCardinality;
    }

    set sourceCardinality(cardinality) {
        if (this.primitive !== null && !this._validateCardinality(cardinality, this.primitive.sourceCardinality)) throw new Error(`Source cardinality must be more restrictive than ${this.primitive.sourceCardinality}`);
        this._sourceCardinality = cardinality;
    }


    get sourceIntrinsicness() {
        return this._sourceIntrinsicness;
    }

    set sourceIntrinsicness(intrinsicness) {
        if (this.primitive !== null && !this._validateIntrinsicness(intrinsicness, this.source.level)) throw new Error(`Invalid source intrinsicness. Should be smaller than ${this.source.level}`);

        this._sourceIntrinsicness = intrinsicness;
    }

    get targetCardinality() {
        return this._targetCardinality;
    }

    set targetCardinality(cardinality) {
        if (this.primitive !== null && !this._validateCardinality(cardinality, this.primitive.targetCardinality)) throw new Error(`Target cardinality must be more restrictive than ${this.primitive.targetCardinality}`);
        this._targetCardinality = cardinality;
    }

    get targetIntrinsicness() {
        return this._targetIntrinsicness;
    }

    set targetIntrinsicness(intrinsicness) {
        if (this.primitive !== null && !this._validateIntrinsicness(intrinsicness, this.target.level)) throw new Error(`Invalid target intrinsicness. Should be smaller than ${this.target.level}`);

        this._targetIntrinsicness = intrinsicness;
    }

    get to() {
        return this.target.id;
    }

};