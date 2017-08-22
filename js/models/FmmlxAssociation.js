"use strict";
if (typeof Model === "undefined") var Model = {};

Model.FmmlxAssociation = class {


    /**
     * Represents an Association
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
    }

    /**
     *
     * @returns {Model.FmmlxRelationEndpoint}
     */
    get source() {
        return this._source;
    }

    /**
     *
     * @param {Model.FmmlxRelationEndpoint} src
     */
    set source(src) {
        if (src.constructor !== Model.FmmlxRelationEndpoint)
            throw new Error("Association source must be a Relatonship endpoint");
        this._source = src;
    }

    /**
     *
     * @returns {Model.FmmlxRelationEndpoint}
     */
    get target() {
        return this._target;
    }

    /**
     *
     * @param {Model.FmmlxRelationEndpoint} tgt
     */
    set target(tgt) {
        if (tgt.constructor !== Model.FmmlxRelationEndpoint)
            throw new Error("Association target must be a Relatonship endpoint");
        this._target = tgt;
    }


    /**
     *
     * @returns {Model.FmmlxAssociation}
     */
    get metaAssociation() {
        return this._metaAssociation;
    }

    /**
     *
     * @param {Model.FmmlxAssociation} meta
     */
    set metaAssociation(meta) {
        if (this.isRefinement)
            throw new Error("An association can not be instance and refiement at the same time");
        this._metaAssociation = meta;
    }

    /**
     *
     * @returns {boolean}
     */
    get isRefinement() {
        return this.primitive !== undefined
    }

    /**
     *
     * @returns {boolean}
     */
    get isInstance() {
        return this.metaAssociation !== undefined
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
     * @param {Model.FmmlxAssociation} instance
     */
    addInstance(instance) {
        this.instances.add(instance)
    }


    get sourceCardinality() {
        return this.source.cardinality
    }

    get targetCardinality() {
        return this.target.cardinality
    }

    get sourceIntrinsicness() {
        return this.source.intrinsicness
    }

    get targetIntrinsicness() {
        return this.target.intrinsicness;
    }

    get sourceRole() {
        return this.source.role;
    }

    get targetRole() {
        return this.target.role;
    }


    /**
     *
     * @param obj
     * @returns {boolean}
     */
    equals(obj) {
        let equals = obj.constructor === "Model.FmmlxAssociation" && obj.source.equals(this.source) && obj.target.equals(this.target)
        if (this.isRefinement)
            equals = equals && this.primitive.equals(obj.primitive)
        else if (this.isInstance)
            equals = equals && this.metaAssociation.equals(obj.metaAssociation)

        return equals;
    }

    get id() {
        let id = JSON.stringify({
            source: this.source,
            target: this.target,
            primitive: (this.isRefinement) ? this.primitive.id : "",
            metaAssociation: (this.isInstance) ? this.metaAssociation.id : ""
        });
        return Helpers.Helper.hashCode(id);
    }

}