import {Comparable, Helper} from '../helpers/Helpers';

import {Behaviours, Property} from '../models/Property';
import {
  ChangedEvent,
  Diagram,
  GraphLinksModel,
  GraphObject,
  Part,
  Point,
  Panel,
} from 'gojs/release/go-module';
import {classShape} from '../shapes/ClassShape';
import {Class} from '../models/Class';
import {Association} from '../models/Association';
import {Inheritance} from '../models/Inheritance';
import {Value} from '../models/Value';

export let tags = new Set<string>();
export let diagram: Diagram;

/**
 * returns a list of fmmlx classes that meets each of <filters> criteria
 * @todo understand how this really works
 */
function filterClasses(filter: any): Class[] {
  const nodeDataArray = diagram.model.nodeDataArray as Class[];
  const matching: Class[] = [];
  for (const node of nodeDataArray) {
    for (const [key, value] of Object.entries(filter)) {
      if (key === 'category') continue;
      if (node[key as keyof Class] === value) matching.push(node);
    }
  }
  return matching;
}

function findCommonProperties(parts: Part[]): Property[] {
  if (parts.length === 0) return [];
  if (parts.length === 1) {
    return parts[0].data.members;
  }

  let base: Class = parts.pop()!.data;

  return base.properties.filter(member => {
    let common = true;
    for (let part of parts) {
      common = common && part.data.members.some((t: Comparable) => t.equals(member));
    }
    return common;
  });
}

function updateTags(newTags: Set<string>) {
  tags = new Set(...newTags, ...tags);
  //newTags.forEach(tag => tags.add(tag));
}

export function init(div: HTMLDivElement) {
  // @ts-ignore
  const licenseKey = `54fe4ee3b01c28c702d95d76423d6cbc5cf07f21de8349a00a5042a3b95c6e172099bc2a01d68dc986ea5efa4e2dc8d8dc96397d914a0c3aee38d7d843eb81fdb53174b2440e128ca75420c691ae2ca2f87f23fb91e076a68f28d8f4b9a8c0985dbbf28741ca08b87b7d55370677ab19e2f98b7afd509e1a3f659db5eaeffa19fc6c25d49ff6478bee5977c1bbf2a3`;
  diagram = GraphObject.make(Diagram, div, {
    'undoManager.isEnabled': true,
    // enable Ctrl-Z to undo and Ctrl-Y to redo
    model: new GraphLinksModel(),
    allowDelete: false,
  });
  // @ts-ignore
  diagram.licenseKey = licenseKey;
  Object.defineProperty(window, 'PIXELRATIO', diagram.computePixelRatio);
  diagram.computePixelRatio();
  //diagram.nodeTemplateMap.add(Class.category, classShape as any);
  //templateMap.add(Association.category, associationShape);
  //templateMap.add(Inheritance.category, inheritanceShape);

  //diagram.model.nodeKeyProperty = `id`;
  (diagram.model as GraphLinksModel).linkKeyProperty = `id`;
}

export function abstractClasses(point: {x: number; y: number}) {
  const classNodes = diagram.selection.toArray();
  const classLevel = (classNodes[0].data as Class).level;
  const level = classLevel === null ? null : classLevel + 1;

  Helper.beginTransaction('Abstracting Selection...', 'AbsSel');
  const classObj = new Class(Helper.randomString(), level, point.x, point.y);
  for (const classShape of classNodes) {
    if (classShape.data.level !== classLevel) {
      Helper.rollbackTransaction();
      throw new Error('All classes to be abstracted must have the same level');
    }
    changeMetaclass(classShape.data, classObj.id);
  }
  const commonMembers = findCommonProperties(classNodes);
  for (const member of commonMembers) {
    addMemberToClass(classObj, member);
  }
  diagram.model.addNodeData(classObj);
  Helper.commitTransaction();
}

/**
 * Adds <memb er> to <classObject> and its descendants (if it does not exist)
 */
export function addMemberToClass(classObject: Class, member: Property): Property | null {
  const collection = classObject.findCorrespondingCollection(member);

  if (collection.has(member)) return null;
  if (
    classObject.hasDefinedLevel &&
    member.hasDefinedIntrinsicness &&
    classObject.level! <= member.intrinsicness!
  )
    return null;

  const collectionName = classObject.findCorrespondingCollectionName(member);
  const oldCollection = new Set(Array.from(collection));
  classObject.lastChangeId = Helper.beginTransaction(`Adding Member to class...`, 'addMember');
  member.classes.add(classObject);
  collection.add(member);
  diagram.model.raiseChangedEvent(
    ChangedEvent.Insert,
    collectionName,
    classObject,
    oldCollection,
    collection
  );

  let descendants = [...classObject.instances, ...classObject.subclasses];
  for (let descendant of descendants) {
    addMemberToClass(descendant, member);
  }
  Helper.commitTransaction();
  return member;
}

/**
 * Adds the corresponding value to a class
 * returns the value or null if nothing was done
 */
export function addValueToClass(
  classObject: Class,
  member: Property,
  value: string | null
): Value | null {
  const collection = classObject.findCorrespondingCollection(member);

  if (collection.has(member)) return null;
  if (
    classObject.hasDefinedLevel &&
    member.hasDefinedIntrinsicness &&
    classObject.level! !== member.intrinsicness!
  )
    return null;

  console.debug(`Adding a value (${value}) of ${member.name} to ${classObject.name}`);
  value = value === null ? Helper.randomString() : value;

  classObject.lastChangeId = Helper.beginTransaction('Adding Value to class...', 'addValue');
  deleteMember(classObject, member);
  const val = new Value(member, value, classObject);
  const oldCollection = new Set(Array.from(collection));
  const collectionName = classObject.findCorrespondingCollectionName(val);
  member.values.set(classObject, val);
  collection.add(val);

  diagram.model.raiseChangedEvent(
    ChangedEvent.Insert,
    collectionName,
    classObject,
    oldCollection,
    collection
  );

  let descendants = [...classObject.instances, ...classObject.subclasses];
  for (let descendant of descendants) {
    deleteMember(descendant, member);
  }
  Helper.commitTransaction();
  return val;
}

/**
 * Changes the level of an FMMLx Class, reevaluates its properties and propagates the changes downstream
 * returns false if the change was not done, true otherwise
 */
export function changeClassLevel(
  classObj: Class,
  newLevel: number | null,
  transId = Helper.randomString()
) {
  if (classObj.lastChangeId === transId) return;

  if (newLevel === classObj.level) {
    console.debug('Change class level: Initial and target levels are the same. Doing nothing.');
    return;
  } else if (newLevel !== null && newLevel < 0)
    throw new Error(`Level would be negative for ${classObj.name}`);

  console.debug(`Changing ${classObj.name}'s level from ${classObj.level} to ${newLevel}`);
  classObj.lastChangeId = transId;
  const instanceLevel = newLevel === null ? null : newLevel - 1;

  if (
    classObj.metaclass !== null &&
    classObj.hasDefinedLevel &&
    classObj.metaclass.level != newLevel! + 1
  ) {
    deleteMetaclass(classObj);
  }

  /* -- Level change only works downstream
                if (classObj.metaclass !== null && classObj.lastChangeId !== transId) {
                    console.debug(`Processing metaclass ${classObj.metaclass.name}...`);
                    changeClassLevel(classObj.metaclass, instanceLevel, transId);
                }

                if (classObj.superclass !== null && classObj.lastChangeId !== transId) {
                    console.debug(`Processing supeclass... ${classObj.superclass.name}.`);
                    changeClassLevel(classObj.superclass, newLevel, transId);
                }
                */
  diagram.model.setDataProperty(classObj, 'level', newLevel);
  processClass(classObj);

  console.debug('Processing instances...');
  for (let instance of classObj.instances) {
    changeClassLevel(instance, instanceLevel, transId);
  }

  console.debug('Processing subclasses...');
  for (let subclass of classObj.subclasses) {
    deleteSuperclass(subclass);
  }
}

/**
 * Changes the metaclass of an FMMLx Class, reevaluates its properties and propagates the changes downstream
 * returns false if the change was not done, true otherwise.
 */
export function changeMetaclass(fmmlxClass: Class, metaclassId: string | null = null) {
  //check for "falsy" values
  if (!metaclassId) {
    deleteMetaclass(fmmlxClass);
    return false;
  }

  const metaclass = diagram.model.findNodeDataForKey(metaclassId) as Class;
  if (fmmlxClass.isExternal) {
    throw new Error(`External classes can not have a local metaclass`);
  }

  if (fmmlxClass.metaclass !== null && fmmlxClass.metaclass.equals(metaclass)) {
    console.debug(`Old and new metaclasses are the same. Doing nothing.`);
    return false;
  }
  if (metaclass.level === null && fmmlxClass.level !== null)
    throw new Error(
      'Only classes with undefined meta-level may instantiate classes with unknown meta-level'
    );

  if (
    metaclass.level !== null &&
    fmmlxClass.level !== null &&
    metaclass.level !== fmmlxClass.level + 1
  ) {
    throw new Error(`Metaclass (${metaclass.name}) level must be ${fmmlxClass.level! + 1}`);
  }

  let transactionMessage = `Change ${fmmlxClass.name}'s metaclass from  ${
    fmmlxClass.metaclass === null ? 'Metaclass' : fmmlxClass.metaclass.name
  } to ${metaclass.name}`;
  Helper.beginTransaction(transactionMessage, 'changeMeta');
  try {
    deleteMetaclass(fmmlxClass);
    diagram.model.setDataProperty(fmmlxClass, 'metaclass', metaclass);
    metaclass.addInstance(fmmlxClass);
    let newProperties = [...metaclass.attributes, ...fmmlxClass.operations];
    for (let member of newProperties) {
      addMemberToClass(fmmlxClass, member);
      addValueToClass(fmmlxClass, member, '');
    }
  } catch (error) {
    Helper.rollbackTransaction();
    throw error;
  }
  Helper.commitTransaction();
  return true;
}

export function changeSuperclass(superclass: Class, subclass: Class) {
  if (superclass === null) {
    console.debug('Superclass is null, doing nothing');
    return;
  }
  if (typeof superclass.level === undefined || superclass.id === subclass.id)
    throw new Error('Invalid selection');
  if (superclass.level !== subclass.level)
    throw new Error('Subclass and Superclass must have the same level.');
  if (subclass.superclass !== null)
    throw new Error('Subclass already inherits from another class.');

  Helper.beginTransaction('Creating inheritance', 'inherit');
  try {
    let properties = superclass.properties;
    for (let property of properties) {
      addMemberToClass(subclass, property);
    }
    diagram.model.setDataProperty(subclass, 'superclass', superclass);
    superclass.addSubclass(subclass);
    let data = new Inheritance(subclass, superclass);
    (diagram.model as GraphLinksModel).addLinkData(data);
    Helper.commitTransaction();
  } catch (e) {
    Helper.commitTransaction();
    throw e;
  }
}

/**
 * Copies a member definition to the metaclass
 */
export function copyMemberToMetaclass(fmmlxClass: Class, member: Property) {
  if (fmmlxClass.metaclass === null) throw new Error('Class has no defined metaclass');
  addMemberToClass(fmmlxClass.metaclass, member);
}

/**
 * Copies a member definition to the superclass
 */
export function copyMemberToSuperclass(fmmlxClass: Class, member: Property | Value) {
  if (fmmlxClass.superclass === null) throw new Error('Class has no defined superclass');
  if (member.constructor === Value) member = (member as Value).property;
  addMemberToClass(fmmlxClass.superclass, member as Property);
}

/**
 * Creates an association from source to target
 */
export function createAssociation(source: Class, target: Class) {
  const assoc = new Association(source, target);
  Helper.beginTransaction('Creating association');
  (diagram.model as GraphLinksModel).addLinkData(assoc);
  Helper.commitTransaction('Creating association');
  return assoc;
}

/**
 * Given an association, creates an instance or a refinement of it
 */
export function createAssociationInstanceOrRefinement(
  association: Association,
  source: Class,
  target: Class,
  isRefinement: boolean = false
) {
  const assoc = new Association(
    source,
    target,
    Helper.randomString(),
    association.sourceCardinality,
    association.targetCardinality,
    association.sourceRole,
    association.targetRole,
    isRefinement ? association.sourceIntrinsicness : null,
    isRefinement ? association.targetIntrinsicness : null,
    isRefinement ? association : null,
    isRefinement ? null : association,
    association.tags
  );

  Helper.beginTransaction(`Instantiating assoc ${association.name}`, 'instantiate');
  try {
    source.addAssociation(assoc);
    target.addAssociation(assoc);

    if (isRefinement) {
      association.addRefinement(assoc);
      assoc.primitive = association;
    } else {
      association.addInstance(assoc);
      assoc.metaAssociation = association;
    }
    (diagram.model as GraphLinksModel).addLinkData(assoc);
    Helper.commitTransaction();
    return assoc;
  } catch (err) {
    Helper.rollbackTransaction();
    throw err;
  }
}

/**
 * Adds a new FMMLX Class to the diagram
 */
export function createClass(
  point: {x: number; y: number},
  name: string,
  level: number | null,
  isAbstract: boolean = false,
  metaclassId: string | null = null,
  externalLanguage: string | null = null,
  externalMetaclass: string | null = null,
  tags = new Set<string>()
) {
  console.debug(`Add Class ${name} at (${point.x}, ${point.y})`);
  const docPoint = diagram.transformViewToDoc(new Point(point.x, point.y));
  const classObject = new Class(
    name,
    level,
    docPoint.x,
    docPoint.y,
    isAbstract,
    externalLanguage,
    externalMetaclass,
    tags
  );
  changeMetaclass(classObject, metaclassId);
  diagram.nodeTemplate = classShape;
  diagram.model.addNodeData(classObject);
  updateTags(tags);
  return classObject;
}

/**
 * Creates an FMMLx class member and associates it to an fmmlx class
 */
export function createMember(
  fmmlxClassId: string,
  name: string,
  type: string,
  intrinsicness: number | null,
  isOperation: boolean,
  behaviors: Behaviours,
  isValue: string,
  value: string = '',
  operationBody: string | null,
  tags: Set<string> = new Set<string>()
) {
  const fmmlxClass = diagram.model.findNodeDataForKey(fmmlxClassId)! as Class;
  if (Boolean(isValue)) {
    intrinsicness = fmmlxClass!.level;
  }

  let member = new Property(name, type, intrinsicness, isOperation, behaviors, operationBody, tags);

  addMemberToClass(fmmlxClass, member);
  if (Boolean(isValue)) {
    addValueToClass(fmmlxClass, member, value);
  }
  updateTags(tags);
}

/**
 * Deletes an FMMLx Association
 * returns true on success
 */
export function deleteAssociation(association: Association) {
  Helper.beginTransaction(`Deleting association ${association.name}`, 'deleteAssoc');
  try {
    association.source.removeAssociation(association);
    association.target.removeAssociation(association);
    if (association.metaAssociation !== null)
      association.metaAssociation.deleteInstance(association);
    if (association.primitive !== null) association.primitive.deleteRefinement(association);
    diagram.remove(diagram.findLinkForData(association)!);
    Helper.commitTransaction();
    return true;
  } catch (err) {
    Helper.rollbackTransaction();
    throw err;
  }
}

/**
 * Deletes an Fmmlx Class and its references
 */
export function deleteFmmlxClass(fmmlxClass: Class) {
  Helper.beginTransaction(`Deleting class ${fmmlxClass.name}`, 'deleteClass');
  try {
    //inheritance -  instantiation
    for (let instance of fmmlxClass.instances) {
      deleteMetaclass(instance);
    }
    for (let subclass of fmmlxClass.subclasses) {
      deleteSuperclass(subclass);
    }

    if (fmmlxClass.superclass !== null) fmmlxClass.superclass.removeSubclass(fmmlxClass);

    deleteMetaclass(fmmlxClass);

    //process own values - members
    for (let value of fmmlxClass.values) {
      deleteValue(fmmlxClass, value);
    }

    for (let property of fmmlxClass.properties) {
      deleteMember(fmmlxClass, property);
    }

    let node = diagram.findNodeForData(fmmlxClass)!;
    diagram.remove(node);
    diagram.model.removeNodeData(fmmlxClass);
  } catch (error) {
    Helper.rollbackTransaction();
    throw error;
  }
  Helper.commitTransaction();
}

export function getClassAt({x, y}: {x: number; y: number}): Class {
  return diagram.findPartAt(new Point(x, y))?.data!;
}

/**
 * Deletes <Property> (and/or its corresponding <Value>) from <fmmlxClass>,
 * its predecessors (`upstream`) and descendants (`downstream`)
 */
export function deleteMember(
  fmmlxClass: Class,
  member: Property | Value,
  upstream: boolean = false,
  downstream: boolean = true
) {
  //delete own
  console.log(`Delete member ${member.id} (and/or its value) from ${fmmlxClass.name}`);
  fmmlxClass.lastChangeId = Helper.beginTransaction('Deleting member...', 'deleteMember');
  const collection = fmmlxClass.findCorrespondingCollection(member);
  const collectionName = fmmlxClass.findCorrespondingCollectionName(member);
  if (!collection.has(member)) return;
  const oldCollection = new Set([...collection]);
  collection.delete(member);

  diagram.model.raiseChangedEvent(
    ChangedEvent.Remove,
    collectionName,
    fmmlxClass,
    oldCollection,
    collection
  );

  if (member.constructor === Property && (member as Property).values.has(fmmlxClass)) {
    deleteValueFromClass(fmmlxClass, (member as Property).values.get(fmmlxClass)!);
  }

  //del downstream
  if (downstream) {
    for (let instance of fmmlxClass.instances) {
      deleteMember(instance, member, false, downstream);
    }
    for (let subclass of fmmlxClass.subclasses) {
      deleteMember(subclass, member, false, downstream);
    }
  }

  //del upstream
  if (upstream) {
    if (fmmlxClass.superclass !== null) {
      deleteMember(fmmlxClass.superclass, member, true, false);
    }
    if (fmmlxClass.metaclass !== null) {
      deleteMember(fmmlxClass.metaclass, member, true, false);
    }
  }
  Helper.commitTransaction();
}

function deleteValueFromClass(fmmlxClass: Class, value: Value) {
  Helper.beginTransaction('Delete value from class');
  const collection = fmmlxClass.findCorrespondingCollection(value);
  const collectionName = fmmlxClass.findCorrespondingCollectionName(value);
  const oldCollection = new Set([...collection]);
  collection.delete(value);
  value.property.values.delete(fmmlxClass);
  delete value.property;
  delete value.class;
  diagram.model.raiseChangedEvent(
    ChangedEvent.Remove,
    collectionName,
    fmmlxClass,
    oldCollection,
    collection
  );
  Helper.commitTransaction();
}

/**
 * Deletes a Class' Metaclass. Returns true if successful, false otherwise
 */
export function deleteMetaclass(fmmlxClass: Class) {
  if (fmmlxClass.metaclass === null) {
    return false;
  }
  Helper.beginTransaction(`Removing old Metaclass from ${fmmlxClass.name}`, 'deleteMetaclass');
  try {
    let metaclass = fmmlxClass.metaclass;
    let deletableProperties = [...metaclass.attributes, ...metaclass.operations];
    for (let member of deletableProperties) {
      deleteMember(fmmlxClass, member);
    }
    diagram.model.setDataProperty(fmmlxClass, 'metaclass', null);
    metaclass.removeInstance(fmmlxClass);
  } catch (error) {
    Helper.rollbackTransaction();
    throw error;
  }
  Helper.commitTransaction();
  return true;
}

/**
 * deletes the superclass, removes the fmmlxClass reference from the superclass, removes inherited members and
 * deletes the link
 */
export function deleteSuperclass(fmmlxClass: Class) {
  const superclass = fmmlxClass.superclass;
  if (superclass !== null) {
    delete fmmlxClass.superclass;
    let linkData = diagram
      .findLinksByExample({
        from: fmmlxClass.id,
        to: superclass.id,
        category: 'Inheritance',
      })
      .first()!.data;
    (diagram.model as GraphLinksModel).removeLinkData(linkData);
    superclass.removeSubclass(fmmlxClass);
    for (let member of superclass.members) {
      deleteMember(fmmlxClass, member);
    }
  }
}

/**
 * Deletes (if exists) <Value> from FmmlxClass
 * Returns true if succesful, false otherwise
 */
export function deleteValue(fmmlxClass: Class, value: Value) {
  console.debug(
    `Delete Value of ${value.property.name}:${value.property.type} in ${fmmlxClass.name}`
  );

  const transId = Helper.beginTransaction('Deleting value...', 'deleteValue');
  diagram.model.setDataProperty(fmmlxClass, 'lastChangeId', transId);
  const collection = fmmlxClass.findCorrespondingCollection(value) as Set<Value>;
  const collectionName = fmmlxClass.findCorrespondingCollectionName(value);
  collection.delete(value);
  value.property.values.delete(value.class);
  delete value.class;
  delete value.property;
  diagram.model.raiseChangedEvent(
    ChangedEvent.Insert,
    collectionName,
    fmmlxClass,
    new Set(),
    collection
  );
  Helper.commitTransaction();
}

export function editAssociation(
  assocId: string,
  name: string,
  sourceCardinality: string,
  sourceIntrinsicness: string | number,
  sourceRole: string,
  targetCardinality: string,
  targetIntrinsicness: string | number,
  targetRole: string
) {
  let association = (diagram.model as GraphLinksModel).findLinkDataForKey(assocId) as Association;
  Helper.beginTransaction('Edit Association', 'EditAssoc');
  diagram.model.setDataProperty(association, 'name', name);
  diagram.model.setDataProperty(association, 'sourceCardinality', sourceCardinality);
  diagram.model.setDataProperty(association, 'sourceRole', sourceRole);
  diagram.model.setDataProperty(association, 'sourceIntrinsicness', sourceIntrinsicness);
  diagram.model.setDataProperty(association, 'targetCardinality', targetCardinality);
  diagram.model.setDataProperty(association, 'targetIntrinsicness', targetIntrinsicness);
  diagram.model.setDataProperty(association, 'targetRole', targetRole);
  Helper.commitTransaction();
}

/**
 * Edits an FMMLx Class and recalculates its properties
 */
export function editFmmlxClass(
  classId: string,
  name: string,
  level: number | null,
  isAbstract: boolean,
  metaclassId: string | null,
  externalLanguage: string | null,
  externalMetaclass: string | null,
  tags: string[] = []
) {
  const fmmlxClass = diagram.model.findNodeDataForKey(classId) as Class;
  console.debug(`Editing class ${fmmlxClass.name}`);

  metaclassId = metaclassId === '' ? null : metaclassId;

  if (isAbstract && fmmlxClass.instances.size > 0) {
    throw new Error('Can not make class abstract because it has instances.');
  }

  let transId = Helper.beginTransaction('Editing Class...', 'editClass');
  try {
    diagram.model.setDataProperty(fmmlxClass, 'isAbstract', Boolean(isAbstract));
    diagram.model.setDataProperty(fmmlxClass, 'name', name);

    if (externalLanguage !== fmmlxClass.externalLanguage) {
      diagram.model.setDataProperty(fmmlxClass, 'externalLanguage', externalLanguage);
    }
    if (externalMetaclass !== fmmlxClass.externalMetaclassName) {
      diagram.model.setDataProperty(fmmlxClass, 'externalMetaclass', externalMetaclass);
    }

    changeClassLevel(fmmlxClass, level, transId);
    //if the level changed the whole chain is refreshed and there is no need to refresh the instances
    //to reflect name changes
    /*if (!changeClassLevel(fmmlxClass, level)) {
                for (let instance of fmmlxClass.instances) {
                    let node =diagram.findNodeForData(instance);
                    node.updateTargetBindings();
                }
            }*/

    changeMetaclass(fmmlxClass, metaclassId);
    if (!(tags === null || tags.length === 0)) {
      fmmlxClass.tags = new Set(tags);
      tags.forEach(tag => fmmlxClass.tags.add(tag));
    }
    diagram.model.setDataProperty(fmmlxClass, 'lastChangeId', transId);
    Helper.commitTransaction();
  } catch (error) {
    Helper.rollbackTransaction();
    throw error;
  }
}

/**
 * Edits an FMMLx Attribute/ Operation / Value
 */
export function editMember(
  classId: string,
  memberId: string,
  name: string,
  type: string,
  intrinsicness: number | null,
  behaviors: Behaviours,
  value: string = '',
  operationBody: string | null = null,
  tags: Set<string> = new Set<string>()
) {
  let classShape = diagram.findNodeForKey(classId) as Panel;
  let classObj: Class = classShape!.data;
  let transId = Helper.beginTransaction(`Edit Member`, 'editMember');
  const member = classObj.findMemberById(memberId);
  updateTags(tags);

  if (member.constructor === Value) {
    (member as Value).value = value;
  } else {
    const set = diagram.model.setDataProperty;
    set(member, 'name', name);
    set(member, 'type', type);
    set(member, 'intrinsicness', intrinsicness);
    set(member, 'behaviors', behaviors);
    set(member, 'operationBody', operationBody);
  }
  tags.forEach(tag => member.tags.add(tag));
  processClass(classObj);

  diagram.model.setDataProperty(member, 'tags', new Set(tags));

  if (member.constructor !== Value && member.intrinsicness !== intrinsicness) {
    diagram.model.setDataProperty(member, 'intrinsicness', intrinsicness);

    let classes = (member as Property).classes.entries(); //.next().value; //toArray().slice(0);
    let values = (member as Property).values.entries(); //.next().value;

    for (let [classObj] of classes) {
      if (classObj.lastChangeId !== transId) {
        processClass(classObj);
        diagram.model.setDataProperty(classObj, 'lastChangeId', transId);
      }
    }

    for (let [classObj] of values) {
      if (classObj.lastChangeId !== transId) {
        processClass(classObj);
        diagram.model.setDataProperty(classObj, 'lastChangeId', transId);
      }
    }
  } else if (member.constructor === Value) {
    //If the instrinsicness is unchanged, it is necessary to refresh the classes that have the edited member
    for (let classObj of (member as Property).classes) {
      let arrayName = classObj.findCorrespondingCollectionName(member);
      diagram.model.updateTargetBindings(classObj, arrayName);
    }
  }

  Helper.commitTransaction();
}

/**
 * Given an array of filter objects, proceeds to apply them recursively to each node in the diagram.
 * and return the matching ones
 * filter = [{tags:["tag1","tag2"], levels:["1","2","?"]},...]
 * @todo figure how this works. I think it never actually worked properly
 */
export function filterModel(filters: {operator: string; tags: string; levels: string[]}[] = []) {
  let realFilters: any[] = [],
    matchingClasses = new Set(),
    matchingAssociations = new Set(),
    matchingMembers = new Map();

  //consolidate filters
  realFilters[0] = filters.shift();
  filters.forEach(filter => {
    if (filter.operator === '') {
      // AND
      let pos = realFilters.length - 1;
      realFilters[pos].tags = realFilters[pos].concat(filter.tags);
      realFilters[pos].levels = realFilters[pos].concat(filter.levels);
    } else realFilters.push(filter);
    //OR
  });

  //evaluate filters

  for (let filter of realFilters) {
    //Evaluate classes and members
    for (const fmmlxClass of diagram.model.nodeDataArray as Class[]) {
      //Evaluate class match with filters
      let levelMatch =
        filter.levels.length === 0 || filter.levels.includes(fmmlxClass.level!.toString());
      let tagMatch = filter.tags.length > 0 && fmmlxClass.tags.size > 0;

      for (let tag of fmmlxClass.tags) {
        if (!tagMatch) break;
        tagMatch = tagMatch && filter.tags.includes(tag);
      }

      if (tagMatch && levelMatch) matchingClasses.add(fmmlxClass);

      //Evaluate member match with filters
      for (let member of fmmlxClass.members) {
        let tagMatch = filter.tags.length > 0 && member.tags.size > 0;

        for (let tag of member.tags) {
          if (!tagMatch) break;
          tagMatch = tagMatch && filter.tags.includes(tag);
        }
        if (tagMatch) {
          if (!matchingMembers.has(fmmlxClass)) matchingMembers.set(fmmlxClass, new Set());
          matchingMembers.get(fmmlxClass).add(member);
        }
      }
    }

    //Evaluate associations
    for (let fmmlxAssociation of (diagram.model as GraphLinksModel)
      .linkDataArray as Association[]) {
      let tagMatch = filter.tags.length > 0 && fmmlxAssociation.tags.size > 0;

      for (let tag of fmmlxAssociation.tags) {
        if (!tagMatch) break;
        tagMatch = tagMatch && filter.tags.includes(tag);
      }

      if (tagMatch) matchingAssociations.add(fmmlxAssociation);
    }
  }
  return {
    classes: matchingClasses,
    members: matchingMembers,
    associations: matchingAssociations,
  };
}

/**
 * Finds instaces/subclasses
 */
export function findDescendants(fmmlxClass: Class): Class[] {
  let children: Class[] = [];

  for (let instance of fmmlxClass.instances) {
    let tmpBranch = findDescendants(instance);
    tmpBranch.push(instance);
    children = children.concat(tmpBranch);
  }

  for (let subclass of fmmlxClass.subclasses) {
    let tmpBranch = findDescendants(subclass);
    tmpBranch.push(subclass);
    children = children.concat(tmpBranch);
  }
  return children;
}

/**
 * Finds the possible root classes of fmmlxClass and returns them in an array
 *
 * The root is defined as an ancestor (a class in the inheritance or instantiation chain of said class)
 * that has neither a metaclass nor a superclass, or if a class has no ancestors, then the class itself is
 * a root class.
 */
export function findRoot(fmmlxClass: Class): Class[] {
  const roots: Class[] = [];
  if (fmmlxClass.superclass === null && fmmlxClass.metaclass === null) roots.push(fmmlxClass);
  if (fmmlxClass.superclass !== null)
    findRoot(fmmlxClass.superclass).forEach(root => roots.push(root));
  if (fmmlxClass.metaclass !== null)
    findRoot(fmmlxClass.metaclass).forEach(root => roots.push(root));
  return roots;
}

/**
 * Finds the parent of each class in classes and hides all the rest
 */
export function findTrees(selectedClasses: Class[]): Class[] {
  let chain: Class[] = [];
  setNodesVisibility(false);
  // hides all classes
  for (let selectedClass of selectedClasses) {
    const roots = findRoot(selectedClass);
    roots.forEach(root => (chain = [...chain, ...findDescendants(root)]));
    chain = [...chain, ...roots];
  }
  return chain;
}

/**
 * Changes the visibility of all nodes
 */
export function setNodesVisibility(visible: boolean) {
  const transId = Helper.beginTransaction('Hiding/Showing all nodes');
  try {
    diagram.nodes.each(node => (node.visible = visible));
    Helper.commitTransaction(transId);
  } catch (err) {
    Helper.rollbackTransaction();
    throw err;
  }
}

export function createInstanceOrRefinement(association: Association, refinement: boolean) {
  setNodesVisibility(false);
  let validDescendants = findValidRelationshipClasses(
    association.source,
    refinement,
    association.sourceIntrinsicness
  );

  //blah;
}

/**
 * Returns an array of valid FmmlxClasses for refinement of a relationship.
 * Valid endpoints for *REFINEMENT* are descendants of each endpoint with *minLevel > intrinsicness*
 * Valid endpoints for *INSTANTIATION* are descendants of each endpoint with *minLevel <= intrinsicness*
 */
export function findValidRelationshipClasses(
  fmmlxClass: Class,
  refinement: boolean,
  intrinsicness: number | null
): Class[] {
  let validClasses: Class[] = [];
  const descendants = Object.freeze([...fmmlxClass.instances, ...fmmlxClass.subclasses]);

  for (const descendant of descendants) {
    if (intrinsicness === null) validClasses.push(descendant);
    else if (refinement && descendant.level !== null && descendant.level > intrinsicness)
      validClasses.push(descendant);
    else if (!refinement && descendant.level !== null && descendant.level <= intrinsicness)
      validClasses.push(descendant);
    validClasses = [
      ...validClasses,
      ...findValidRelationshipClasses(descendant, refinement, intrinsicness),
    ];
  }

  return validClasses;
}

/**
 *
 *@todo revisit this keeping in mind the new toJSON() methods in each of the Models.* classes
 */
export function fromJSON(_jsonData: string) {
  //@todo
}

/**
 * Finds all classes that are level +1
 */
export function getClassesByLevel(level: number | null): Array<Class> {
  let targetLevel = level !== null ? level + 1 : null;
  return filterClasses({level: targetLevel});
}

/**
 * Checks what to do with a member in a class:
 *  if intrinsicness > level : the member + its value is deleted
 *  if intrinsicness = level: the member gets deleted +  a value is created
 *  if intrinsicness < level: if there is a value its gets deleted and the member gets added
 *  if the class or the property have undefined levels, then do nothing
 *
 *  Then it does the same for each class downstream.
 */
export function processClass(fmmlxClass: Class) {
  console.debug(`Processing all members in ${fmmlxClass.name}`);

  const membersAndValues = [...fmmlxClass.members, ...fmmlxClass.values];
  for (let member of membersAndValues) {
    if (!member.hasDefinedIntrinsicness || !fmmlxClass.hasDefinedLevel) continue;

    if (member.intrinsicness! > fmmlxClass.level!) {
      if (member.constructor === Value) deleteValue(fmmlxClass, member as Value);
      else deleteMember(fmmlxClass, member as Property);
    } else if (member.intrinsicness! === fmmlxClass.level!) {
      if (member.constructor === Value) continue;
      addValueToClass(fmmlxClass, member as Property, null);
      deleteMember(fmmlxClass, member as Property);
    } else {
      if (member.constructor === Property) continue;
      deleteValue(fmmlxClass, member as Value);
      addMemberToClass(fmmlxClass, (member as Value).property);
    }
  }
  fmmlxClass.descendants.forEach(descendant => processClass(descendant));
}

/**
 * Exports the diagram as JSON
 */
export function toJSON() {
  const flatData = {
    classes: new Map() as Map<string, Class>,
    associations: new Map() as Map<string, Association>,
  };
  const nodes = diagram.nodes;
  const links = diagram.links;
  while (nodes.next()) {
    if (nodes.value.data.constructor !== Class) continue;
    const currentClass: Class = nodes.value.data;
    flatData.classes.set(currentClass.id, currentClass);
  }
  while (links.next()) {
    if (links.value.data.constructor !== Association) continue;
    const currentLink: Association = links.value.data;
    flatData.associations.set(currentLink.id, currentLink);
  }
  return JSON.stringify(flatData);
}

export function toPNG() {
  return diagram.makeImageData({
    scale: 1,
    background: 'rgba(255, 255, 255, 0.8)',
  });
}

/**
 * Hides all classes and shows only the ones in classArray
 */
export function showClasses(classArray: Class[]) {
  setNodesVisibility(false);
  const transId = Helper.beginTransaction('Showing selected classes');
  classArray.forEach(fmmlxClass => (diagram.findNodeForData(fmmlxClass)!.visible = true));
  Helper.commitTransaction(transId);
}
