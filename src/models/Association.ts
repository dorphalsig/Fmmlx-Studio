'use strict';

import {Class} from './Class';
import * as Helpers from '../helpers/Helpers';
import {Serializable, Comparable} from '../helpers/Helpers';

/**
 * Represents an Association
 */

export class Association implements Serializable, Comparable {
  name: string;
  sourceRole: string;
  targetRole: string;
  id: string;
  tags: Set<string>;
  // Instance
  readonly #source: Class;
  readonly #target: Class;
  primitive?: Association;
  metaAssociation?: Association;
  #refinements: Helpers.CustomSet<Association> = new Helpers.CustomSet<Association>();
  #instances: Helpers.CustomSet<Association> = new Helpers.CustomSet<Association>();
  #sourceCardinality: string = '0..*';
  #sourceIntrinsicness?: number;
  #targetCardinality: string = '0..*';
  #targetIntrinsicness?: number;

  get source() {
    return this.#source;
  }

  get target() {
    return this.#target;
  }

  constructor(
    source: Class,
    target: Class,
    name: string,
    sourceCardinality: string,
    targetCardinality: string,
    sourceRole: string,
    targetRole: string,
    sourceIntrinsicness?: number,
    targetIntrinsicness?: number,
    primitive?: Association,
    metaAssociation?: Association,
    tags: string[] = []
  ) {
    Object.setPrototypeOf(this, {});
    this.#source = source;
    this.#target = target;
    this.name = name;
    this.sourceRole = sourceRole;
    this.targetRole = targetRole;
    this.primitive = primitive;
    this.metaAssociation = metaAssociation;
    this.#sourceCardinality = sourceCardinality;
    this.#targetCardinality = targetCardinality;
    this.#sourceIntrinsicness = sourceIntrinsicness;
    this.#targetIntrinsicness = targetIntrinsicness;
    //@todo change these array types to sets with custom equality
    this.id = Helpers.Helper.randomString();
    this.tags = new Set<string>();
    tags = Array.isArray(tags) ? tags : [tags];
    tags.forEach(tag => this.tags.add(tag));
  }

  static readonly category = 'fmmlxAssociation';

  get from() {
    return this.#source.id;
  }

  get isInstance(): boolean {
    return this.metaAssociation !== null;
  }

  get isRefinement(): boolean {
    return this.primitive !== null;
  }

  get sourceCardinality() {
    return this.#sourceCardinality;
  }

  set sourceCardinality(cardinality: string) {
    if (
      this.primitive !== undefined &&
      !Association.validateCardinality(cardinality, this.primitive.sourceCardinality)
    )
      throw new Error(
        `Source cardinality must be more restrictive than ${this.primitive.sourceCardinality}`
      );
    this.#sourceCardinality = cardinality;
  }

  get sourceIntrinsicness() {
    return this.#sourceIntrinsicness;
  }

  set sourceIntrinsicness(intrinsicness: number | undefined) {
    if (intrinsicness !== undefined && (!Number.isInteger(intrinsicness) || intrinsicness < 0))
      throw new Error(`Invalid source intrinsicness.`);
    if (
      this.primitive !== undefined &&
      !Association.validateIntrinsicness(intrinsicness, this.#source.level)
    )
      throw new Error(`Invalid source intrinsicness.`);

    this.#sourceIntrinsicness = intrinsicness;
  }

  get targetCardinality() {
    return this.#targetCardinality;
  }

  set targetCardinality(cardinality) {
    if (
      this.primitive !== undefined &&
      !Association.validateCardinality(cardinality, this.primitive.targetCardinality)
    )
      throw new Error(
        `Target cardinality must be more restrictive than ${this.primitive.targetCardinality}`
      );
    this.#targetCardinality = cardinality;
  }

  get targetIntrinsicness() {
    return this.#targetIntrinsicness;
  }

  set targetIntrinsicness(intrinsicness) {
    if (intrinsicness !== undefined && (!Number.isInteger(intrinsicness) || intrinsicness < 0))
      throw new Error(`Invalid target intrinsicness.`);
    if (
      this.primitive !== undefined &&
      !Association.validateIntrinsicness(intrinsicness, this.#target.level)
    )
      throw new Error(`Invalid target intrinsicness. Should be smaller than ${this.#target.level}`);

    this.#targetIntrinsicness = intrinsicness;
  }

  get to() {
    return this.#target.id;
  }

  /**
   *  Inflates a deflated FmmlxAssociation
   */
  static inflate(
    flatData: Association,
    source: Class,
    target: Class,
    primitive: Association,
    meta: Association
  ) {
    let assoc = new Association(
      source,
      target,
      flatData.name,
      flatData.sourceCardinality,
      flatData.targetCardinality,
      flatData.sourceRole,
      flatData.targetRole,
      flatData.sourceIntrinsicness,
      flatData.targetIntrinsicness,
      primitive,
      meta
    );
    assoc.id = flatData.id;
    return assoc;
  }

  /**
   * Validates that <cardinality> is a more restrictive cardinality than <reference>
   */
  private static validateCardinality(cardinality: string, reference: string): boolean {
    const regex = /^(\d+|\*) *(?:,|\.{2}) *(\d+|\*)$/g; //
    const cardArray = regex.exec(cardinality.trim());
    regex.lastIndex = 0;
    const refArray = regex.exec(reference.trim());
    const cardSource = cardArray![0] === '*' ? -Infinity : parseInt(cardArray![0]);
    const refSource = refArray![0] === '*' ? -Infinity : parseInt(refArray![0]);
    const cardTarget = cardArray![1] === '*' ? Infinity : parseInt(cardArray![1]);
    const refTarget = refArray![1] === '*' ? Infinity : parseInt(refArray![1]);
    return cardSource >= refSource && cardTarget <= refTarget;
  }

  /**
   * Validates an intrinsicness value vs a reference.
   */
  private static validateIntrinsicness(
    intrinsicness: number | undefined,
    reference: number | undefined
  ) {
    if (reference === undefined) return true;
    if (intrinsicness === undefined) return false;
    return intrinsicness <= reference;
  }

  addInstance(instance: Association) {
    this.#instances.add(instance);
  }

  addRefinement(refinement: Association) {
    this.#refinements.add(refinement);
  }

  deflate() {
    return this.toJSON();
  }

  /**
   * Returns a flat JSON representation of the Association state, namely the references to other models (namely FmmlxClass & FmmlxAssociation)
   * are replaced by their respective id
   * @todo persist in indexeddb
   */
  toJSON() {
    const refinements: string[] = [];
    const instances: string[] = [];

    const flat = {
      source: this.#source.id,
      target: this.#target.id,
      primitive: this.primitive,
      metaAssociation: this.metaAssociation !== undefined ? this.metaAssociation.id : undefined,
      sourceIntrinsicness: this.#sourceIntrinsicness,
      sourceCardinality: this.#sourceCardinality,
      targetIntrinsicness: this.#targetIntrinsicness,
      targetCardinality: this.#targetCardinality,
      refinements: this.#refinements.toArray().map(val => val.id),
      instances: this.#instances.toArray().map(val => val.id),
      tags: Array.from(this.tags),
      category: Association.category,
    };

    return JSON.stringify({...this, ...flat});
  }

  /**
   * Removes an instance of this association.
   * Will also remove itself as the primitive of the other association
   */
  deleteInstance(remove: Association) {
    this.#instances.remove(remove);
    remove.deleteMetaAssociation();
  }

  /**
   * Deletes an instance
   */
  deleteRefinement(remove: Association) {
    this.#refinements.remove(remove);
    remove.deletePrimitive();
  }

  equals(obj: unknown): boolean {
    if (!obj || typeof obj !== 'object') return false;
    let equals =
      obj!.constructor === Association &&
      (obj as Association).#source.equals(this.#source) &&
      (obj as Association).#target.equals(this.#target);
    if (this.isRefinement) {
      equals = equals && this.primitive!.equals((obj as Association).primitive);
    } else if (this.isInstance) {
      equals = equals && this.metaAssociation!.equals((obj as Association).metaAssociation);
    }
    return equals;
  }

  protected deletePrimitive() {
    delete this.primitive;
  }

  protected deleteMetaAssociation() {
    delete this.metaAssociation;
  }
}
