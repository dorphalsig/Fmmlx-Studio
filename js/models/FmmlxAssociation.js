"use strict";
if (typeof Model === "undefined") {
    window.Model = {};
}


/**
 * Represents an Association
 * @type {Model.FmmlxAssociation}
 */
Model.FmmlxAssociation = class {


    // Instance
    /**
     * @param {Model.FmmlxRelationEndpoint} source
     * @param {Model.FmmlxRelationEndpoint} target
     * @param {Model.FmmlxAssociation} primitive
     * @param {Model.FmmlxAssociation} metaAssociation
     */
    constructor(source, target, primitive = undefined, metaAssociation = undefined) {

        this.source = source;
        this.target = target;
        this.primitive = primitive;
        this.metaAssociation = metaAssociation;
        this.refinements = new Helpers_Set();
        this.instances = new Helpers_Set();
        this.id = Helper.Helper.uuid4();
    }

    static get category() {
        return "fmmlxAssociation";
    }

    get category() {
        return "fmmlxAssociation";
    }

    get from() {
        return this.source.class;
    }

    /**
     *
     * @returns {boolean}
     */
    get isInstance() {
        return this.metaAssociation !== undefined;
    }

    get to() {
        return this.target.class;
    }

    /**
     *
     * @returns {boolean}
     */
    get isRefinement() {
        return this.primitive !== undefined;
    }

    get sourceCardinality() {
        return this.source.cardinality;
    }

    get sourceIntrinsicness() {
        return this.source.intrinsicness;
    }

    get sourceRole() {
        return this.source.role;
    }

    get targetCardinality() {
        return this.target.cardinality;
    }

    get targetIntrinsicness() {
        return this.target.intrinsicness;
    }

    get targetRole() {
        return this.target.role;
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

};