//import * as go from 'g'; //.js';
import * as go from 'gojs/release/go-module'; //.js';
import {diagram} from './ViewController';
import {Comparable, Helper} from '../helpers/Helpers'; //.js';
import {Association, Class, Inheritance, Property, Value} from '../models/Models';
import {Behaviours} from '../models/Property';
import {
  ChangedEvent,
  Diagram,
  DiagramEvent,
  GraphLinksModel,
  Part,
  Point,
} from 'gojs/release/go-module'; //.js';

export let tags = new Set<string>();

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

function findCommonMembers(parts: Part[]): Property[] {
  if (parts.length === 0) return [];
  if (parts.length === 1) {
    return parts[0].data.members;
  }

  let base: Class = parts.pop()!.data;

  return base.members.filter(member => {
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

/**
 * @todo this goes in viewcontroller
 */
export function abstractClasses() {
  let fmmlxClassNodes = diagram.selection.toArray();
  let classLevel = fmmlxClassNodes[0].data.level;
  let partCreatedHandler = (diagramEvent: DiagramEvent) => {
    diagramEvent.diagram.removeDiagramListener('PartCreated', partCreatedHandler);
    Helper.beginTransaction('Abstracting Selection...', 'AbsSel');

    let commonMembers = findCommonMembers(fmmlxClassNodes);
    for (let member of commonMembers) {
      addMemberToClass(diagramEvent.subject.data, member);
    }
    for (let fmmlxClassNode of fmmlxClassNodes) {
      if (fmmlxClassNode.data.level !== classLevel) {
        Helper.rollbackTransaction();
        throw new Error('All classes to be abstracted must have the same level');
      }
      changeMetaclass(fmmlxClassNode.data, diagramEvent.subject.data.id);
    }
    Helper.commitTransaction();
  };

  let randomName = `AbstractClass ${Helper.randomString()}`;
  let level = classLevel === '?' ? '?' : classLevel + 1;
  let x: number, y: number;
  /*
  createClass({
    name: randomName,
    level: level,
    isAbstract: false,
    metaclassId: null,
    externalLanguage: null,
    externalMetaclass: null,
    tags: undefined,
    x: x,
    y: y,
  });*/
}

/**
 * Adds <Property> to <fmmlxClass> and its descendants (if it does not exist)
 * Returns true if successful false otherwise
 */
export function addMemberToClass(fmmlxClass: Class, member: Property): boolean {
  const transId = Helper.beginTransaction(`Adding Member to class...`, 'addMember');
  fmmlxClass.lastChangeId = transId;
  const collection = fmmlxClass.findCorrespondingCollection(member);
  const collectionName = fmmlxClass.findCorrespondingCollectionName(member);
  const oldCollection = new Set(Array.from(collection));

  member.classes.add(fmmlxClass);
  collection.add(member);
  diagram.model.raiseChangedEvent(
    ChangedEvent.Insert,
    collectionName,
    fmmlxClass,
    oldCollection,
    collection
  );
  processClass(fmmlxClass);
  let descendants = [...fmmlxClass.instances, ...fmmlxClass.subclasses];
  for (let descendant of descendants) {
    addMemberToClass(descendant, member);
  }
  Helper.commitTransaction();
  return true;
}

/**
 * Adds the corresponding value to a class
 * returns the value or null if nothing was done
 */
export function addValueToClass(fmmlxClass: Class, member: Property, value: string | null) {
  console.debug(`Adding a value (${value}) of ${member.name} to ${fmmlxClass.name}`);
  value = value === null ? Helper.randomString() : value;

  if (
    (!member.hasDefinedIntrinsicness && fmmlxClass.hasDefinedLevel) ||
    member.intrinsicness !== fmmlxClass.level
  ) {
    console.debug(
      `${fmmlxClass.name}'s level is different from the member's (${member.name}) intrinsicness. Doing nothing`
    );
    return;
  }

  fmmlxClass.lastChangeId = Helper.beginTransaction('Adding Value to class...', 'addValue');
  deleteMember(fmmlxClass, member);
  const val = new Value(member, value, fmmlxClass);
  const collection = fmmlxClass.findCorrespondingCollection(val);
  const oldCollection = new Set(Array.from(collection));
  const collectionName = fmmlxClass.findCorrespondingCollectionName(val);
  member.values.set(fmmlxClass, val);
  collection.add(val);
  diagram.model.raiseChangedEvent(
    ChangedEvent.Insert,
    collectionName,
    fmmlxClass,
    oldCollection,
    collection
  );
  Helper.commitTransaction();
  //return val;
}

/**
 * Changes the level of an FMMLx Class, reevaluates its properties and propagates the changes downstream
 * returns false if the change was not done, true otherwise
 */
export function changeClassLevel(fmmlxClass: Class, newLevel: number | null, transId: string) {
  if (fmmlxClass.lastChangeId === transId) return;
  fmmlxClass.lastChangeId = transId;
  if (newLevel === fmmlxClass.level) {
    console.debug('Change class level: Initial and target levels are the same. Doing nothing.');
    return;
  } else if (newLevel !== null && newLevel < 0)
    throw new Error(`Level would be negative for ${fmmlxClass.name}`);

  console.debug(`Changing ${fmmlxClass.name}'s level from ${fmmlxClass.level} to ${newLevel}`);
  const instanceLevel = newLevel === null ? null : newLevel - 1;

  /* -- Level change only works downstream
                if (fmmlxClass.metaclass !== null && fmmlxClass.lastChangeId !== transId) {
                    console.debug(`Processing metaclass ${fmmlxClass.metaclass.name}...`);
                    changeClassLevel(fmmlxClass.metaclass, instanceLevel, transId);
                }


                if (fmmlxClass.superclass !== null && fmmlxClass.lastChangeId !== transId) {
                    console.debug(`Processing supeclass... ${fmmlxClass.superclass.name}.`);
                    changeClassLevel(fmmlxClass.superclass, newLevel, transId);
                }
                */
  diagram.model.setDataProperty(fmmlxClass, 'level', newLevel);
  processClass(fmmlxClass);

  if (fmmlxClass.instances.size > 0) {
    console.debug('Processing instances...');
    for (let instance of fmmlxClass.instances) {
      changeClassLevel(instance, instanceLevel, transId);
    }
  }

  if (fmmlxClass.subclasses.size > 0) {
    console.debug('Processing subclasses...');
    for (let subclass of fmmlxClass.subclasses) {
      deleteSuperclass(subclass);
    }
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

export function changeClassSuperclass(superclass: Class, subclass: Class) {
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

  let transId = Helper.beginTransaction('Creating inheritance', 'inherit');
  try {
    let members = superclass.members;
    for (let member of members) {
      addMemberToClass(subclass, member);
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
  Helper.beginTransaction(`Associating ${source.name} and ${target.name}`, 'assoc');
  let assoc = new Association(
    source,
    target,
    Helper.randomString(),
    '0,*',
    '0,*',
    'src',
    'dst',
    null,
    null,
    null,
    null
  );
  (diagram.model as GraphLinksModel).addLinkData(assoc);
  source.addAssociation(assoc);
  target.addAssociation(assoc);
  Helper.commitTransaction();
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
  let transId = Helper.beginTransaction(`Instantiating assoc ${association.name}`, 'instantiate');
  try {
    let assoc;
    if (isRefinement) {
      assoc = new Association(
        source,
        target,
        Helper.randomString(),
        association.sourceCardinality,
        association.targetCardinality,
        association.sourceRole,
        association.targetRole,
        association.targetIntrinsicness,
        association.sourceIntrinsicness,
        association.primitive,
        association.metaAssociation,
        association.tags
      );
    } else {
      assoc = new Association(
        source,
        target,
        Helper.randomString(),
        association.sourceCardinality,
        association.targetCardinality,
        association.sourceRole,
        association.targetRole,
        null,
        null,
        null,
        association
      );
    }
    (diagram.model as GraphLinksModel).addLinkData(assoc);
    source.addAssociation(assoc);
    target.addAssociation(assoc);

    if (isRefinement) {
      association.addRefinement(assoc);
      assoc.primitive = association;
    } else {
      association.addInstance(assoc);
      assoc.metaAssociation = association;
    }

    Helper.commitTransaction();
  } catch (err) {
    Helper.rollbackTransaction();
    throw err;
  }
}

export function deduplicate(
  what: Association | Class | Inheritance | Property | Value,
  where?: Diagram
) {}

/**
 * Adds a new FMMLX Class to the diagram
 */
export async function createClass({
  name,
  level = null,
  isAbstract,
  metaclassId = null,
  externalLanguage = null,
  externalMetaclass = null,
  tags = new Set(),
}: {
  name: string;
  level: number | null;
  isAbstract: boolean;
  metaclassId: string | null;
  externalLanguage: string | null;
  externalMetaclass: string | null;
  tags?: Set<string>;
}): Promise<void> {
  //step 0 wait for click
  const point = await new Promise<Point>((resolve, reject) => {
    setTimeout(() => reject, 45000);
    diagram.addDiagramListener('BackgroundSingleClicked', _e =>
      resolve(diagram.lastInput.documentPoint)
    );
  });

  //Step 1 Search for dupes

  let fmmlxClass = new Class(
    name,
    level,
    isAbstract,
    externalLanguage,
    externalMetaclass,
    tags,
    point.x,
    point.y
  );
  let dupe = diagram.model.findNodeDataForKey(fmmlxClass.id);
  if (dupe !== null) {
    throw new Error(`An equivalent class definition already exists.`);
  }
  updateTags(tags);
  console.debug(`Add Class ${name}`);

  let partCreatedHandler = (diagramEvent: DiagramEvent) => {
    diagramEvent.diagram.removeDiagramListener('PartCreated', partCreatedHandler);
    let tool = diagramEvent.diagram.toolManager.clickCreatingTool;
    tool.archetypeNodeData = null;
    tool.isDoubleClick = true;
    changeMetaclass(diagramEvent.subject.data, metaclassId);
  };
  //Step 3 once we have a part instance we add its metaclass
  diagram.addDiagramListener('PartCreated', partCreatedHandler);
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
  let transId = Helper.beginTransaction(`Deleting association ${association.name}`, 'deleteAssoc');
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
  let transId = Helper.beginTransaction(`Deleting class ${fmmlxClass.name}`, 'deleteClass');
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

    for (let member of fmmlxClass.members) {
      deleteMember(fmmlxClass, member);
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

/**
 * Deletes <Property> (and/or its corresponding <Value>) from <fmmlxClass>,
 * its predecessors (`upstream`) and descendants (`downstream`)
 */
export function deleteMember(
  fmmlxClass: Class,
  member: Property,
  upstream: boolean = false,
  downstream: boolean = true
) {
  //delete own
  console.log(`Delete member ${member.name} (and/or its value) from ${fmmlxClass.name}`);
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
  if (member.values.has(fmmlxClass)) {
    deleteValueFromClass(fmmlxClass, member.values.get(fmmlxClass)!);
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

  const transId = Helper.beginTransaction(
    `Removing old Metaclass from ${fmmlxClass.name}`,
    'deleteMetaclass'
  );
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
 * Returns the model for whatever was clicked in the Diagram
 */
export function getClickedPoint(): Promise<Class | Value | Property | Association | Inheritance> {
  return new Promise<any>(resolve => {
    const handler = (event: DiagramEvent) => {
      diagram.removeDiagramListener('ObjectSingleClicked', handler);
      resolve(event.subject.part.data);
    };
    diagram.addDiagramListener('ObjectSingleClicked', handler);
  });
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
  intrinsicness: string,
  behaviors: Behaviours,
  value: string = '',
  operationBody: string | null = null,
  tags: Set<string> = new Set<string>()
) {
  let node = diagram.findNodeForKey(classId);
  let fmmlxClass: Class = node!.data;
  let member = fmmlxClass.findMemberById(memberId);
  let otherAttributes = {
    name: name,
    type: type,
    behaviors: behaviors,
    operationBody: operationBody,
  };
  let transId = Helper.beginTransaction(`Edit Member`, 'editMember');
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
  processClass(fmmlxClass);

  /*
      diagram.model.setDataProperty(member, 'tags', new Set(tags));

      if (member.constructor !== Value && member.intrinsicness !== intrinsicness) {
        diagram.model.setDataProperty(member, 'intrinsicness', intrinsicness);

        //process each class related to the member
        let classes = (member as Property).classes.toArray().slice(0);
        let values = Array.from((member as Property).values.toArray()).slice(0);
        //just in case we make a static clone

        for (let fmmlxClass of classes) {
          if (fmmlxClass.lastChangeId !== transId) {
            processClass(fmmlxClass);
            diagram.model.setDataProperty(fmmlxClass, 'lastChangeId', transId);
          }
        }

        for (let value of values) {
          let fmmlxClass = value.class;
          if (fmmlxClass.lastChangeId !== transId) {
            processClass(fmmlxClass);
            diagram.model.setDataProperty(fmmlxClass, 'lastChangeId', transId);
          }
        }
      } else if (member.isValue === false) {
        //If the instrinsicness is unchanged, it is necessary to refresh the classes that have the edited member
        for (let fmmlxClass of member.classes) {
          let arrayName = fmmlxClass.findCorrespondingCollection(member, true);
          diagram.model.updateTargetBindings(fmmlxClass, arrayName);
        }
      }
    } catch (e) {
      Helper.commitTransaction();
      throw e;
    }*/
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
export function fromJSON(jsonData: string) {
  let transId = Helper.beginTransaction('Importing JSON', 'import');
  try {
    let flatData = JSON.parse(jsonData);

    while (flatData.nodes.length > 0) {
      let level = flatData.nodes.pop();
      if (Array.isArray(level)) {
        for (let data of level) {
          let node = inflateClass(data.data);
          node.location = Point.parse(data.location);
        }
      }
    }
    for (let link of flatData.links) {
      if (link.category === Inheritance.category) {
        let subclass = (diagram.model as GraphLinksModel).findLinkDataForKey(
          link.subclass
        ) as Class;
        let superclass = (diagram.model as GraphLinksModel).findLinkDataForKey(
          link.superclass
        ) as Class;
        changeClassSuperclass(superclass, subclass);
      } else if (link.category === Association.category) {
        let source = diagram.model.findNodeDataForKey(link.source) as Class;
        let target = diagram.model.findNodeDataForKey(link.target) as Class;
        let primitive =
          link.primitive !== null
            ? ((diagram.model as GraphLinksModel).findLinkDataForKey(
                link.primitive
              )! as Association)
            : null;
        let metaAssoc =
          link.metaAssociation !== null
            ? ((diagram.model as GraphLinksModel).findLinkDataForKey(
                link.metaAssociation
              )! as Association)
            : null;
        let assoc = Association.inflate(link, source, target, primitive, metaAssoc);
        (diagram.model as GraphLinksModel).addLinkData(assoc);
        link.instances.forEach((instance: any) => {
          let assocInstance: Association = (diagram.model as GraphLinksModel).findLinkDataForKey(
            instance
          )! as Association;
          if (assocInstance !== null) {
            diagram.model.setDataProperty(assocInstance, 'metaAssoc', assoc);
            assoc.addInstance(assocInstance);
          }
        });
        link.refinements.forEach((refinement: any) => {
          /**
           * @type {Model.FmmlxAssociation}
           */
          let assocRefinement = (diagram.model as GraphLinksModel).findLinkDataForKey(
            refinement
          ) as Association;
          if (assocRefinement !== null) {
            diagram.model.setDataProperty(assocRefinement, 'primitive', assoc);
            assoc.addRefinement(assocRefinement);
          }
        });
      }
    }

    Helper.commitTransaction();
  } catch (err) {
    Helper.rollbackTransaction();
    throw err;
  }
}

/**
 * Finds all classes that are level +1
 */
export function getClassesByLevel(level: number | null): Array<Class> {
  let targetLevel = level !== null ? level + 1 : null;
  return filterClasses({level: targetLevel});
}

/**
 * Inflates an Fmmlx Class that was deflated
 * @todo revisit this keeping in mind the new toJSON() methods in each of the Models.* classes
 */

export function inflateClass(flatClass: any): any {
  let transId = Helper.beginTransaction(`Inflating ${flatClass.name}`, 'inflate');
  try {
    /**
     * @type {Model.FmmlxClass}
     */
    let fmmlxClass: Class = Class.inflate(flatClass);
    diagram.model.addNodeData(fmmlxClass);
    changeMetaclass(fmmlxClass, flatClass.metaclass);
    updateTags(flatClass.tags);

    if (flatClass.superclass !== null) {
      let superclass = diagram.model.findNodeDataForKey(flatClass.superclass)! as Class;
      changeClassSuperclass(superclass, fmmlxClass);
    }

    for (let flatMember of flatClass.members) {
      let member = Property.inflate(flatMember);
      addMemberToClass(fmmlxClass, member);
      if (flatMember.tags !== null && flatMember.tags.length > 0) updateTags(flatMember.tags);
    }

    for (let flatValue of flatClass.values) {
      let member = Property.inflate(flatValue);
      addValueToClass(fmmlxClass, member, flatValue.value);
    }

    diagram.findNodeForKey(fmmlxClass.id)!.updateTargetBindings();
    Helper.commitTransaction();
    return diagram.findNodeForKey(fmmlxClass.id);
  } catch (e) {
    Helper.rollbackTransaction();
    throw e;
  }
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
