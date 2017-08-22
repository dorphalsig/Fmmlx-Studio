"use strict";
if (typeof Model === "undefined") var Model = {};

Model.FmmlxRelationEndpoint = class {

    constructorw(instrinsicness, cardinality, role, fmmlxClass, relation) {
        this.intrinsicness = instrinsicness;
        this.cardinality = cardinality;
        this.role = role;
        this.class = fmmlxClass;
        this.relation = relation;
    }

    get cardinality() {
        return `${this.minCardinality},${this.maxCardinality}`
    }

    set cardinality(cardinality) {
        let cardArray = cardinality.split("/..|,/");
        cardArray[0] = cardArray[0].trim();
        cardArray[1] = cardArray[1].trim();
        this.minCardinality = cardArray[0] === "*" ? Infinity : Number.parseInt(cardArray[0])
        this.maxCardinality = cardArray[1] === "*" ? Infinity : Number.parseInt(cardArray[0])
    }

    isMoreRestrictive(obj) {
        if (obj.constructor !== Model.FmmlxRelationEndpoint)
            throw new Error("Compared object is not a Rel Endpoint")

        retun(obj.minCardinality >= this.minCardinality && obj.maxCardinality <= this.minCardinality)
    }

    get id() {
        let id = {
            intrinsicness: this.intrinsicness,
            cardinality: this.cardinality,
            role: this.role,
            fmmlxClass: this.class.id,
            relation: this.relation.id
        };
        return Helper.Helper.hashCode(JSON.stringify(id));
    }


    equals(obj) {
        return obj.constructor === Model.FmmlxRelationEndpoint && this.intrinsicness === obj.intrinsicness && this.maxCardinality === obj.maxCardinality && obj.minCardinality === this.minCardinality && obj.role === this.role && this.class === obj.class && this.relation === obj.relation
    }


}

