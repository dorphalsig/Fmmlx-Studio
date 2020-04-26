import * as go from 'gojs';
import {ChangedEvent} from 'gojs';
import * as Shapes from '../shapes/Shapes';
import {Comparable, Helper} from '../helpers/Helpers';
import {Association, Class, Inheritance, Property, Value} from '../models/Models';

`use strict`;

const tags = new Set<String>();
export class StudioController {
  diagram: go.Diagram;

  /**
   *  Constructor, receives the id of the div that's the parent for the GoJS canvas
   */
  constructor(div: string = 'canvas') {
    // @ts-ignore
    go.licenseKey = `54fe4ee3b01c28c702d95d76423d6cbc5cf07f21de8349a00a5042a3b95c6e172099bc2a01d68dc986ea5efa4e2dc8d8dc96397d914a0c3aee38d7d843eb81fdb53174b2440e128ca75420c691ae2ca2f87f23fb91e076a68f28d8f4b9a8c0985dbbf28741ca08b87b7d55370677ab19e2f98b7afd509e1a3f659db5eaeffa19fc6c25d49ff6478bee5977c1bbf2a3`;
    this.diagram = go.GraphObject.make(go.Diagram, div, {
      'undoManager.isEnabled': true,
      // enable Ctrl-Z to undo and Ctrl-Y to redo
      model: new go.GraphLinksModel(),
      allowDelete: false,
    });
    Helper.diagram = this.diagram;
    Object.defineProperty(window, 'PIXELRATIO', this.diagram.computePixelRatio);
    this.diagram.computePixelRatio();
    this.diagram.nodeTemplateMap.add(Class.category, Shapes.classShape as go.Node);
    this.diagram.linkTemplateMap.add(Association.category, Shapes.associationShape);
    this.diagram.linkTemplateMap.add(Inheritance.category, Shapes.inheritanceShape);
    this.diagram.model.nodeKeyProperty = `id`;
    (this.diagram.model as go.GraphLinksModel).linkKeyProperty = `id`;
  }

  /**
   * returns a list of fmmlx classes that meets each of <filters> criteria
   * @todo understand how this really works
   */
  private filterClasses(filter: any): Class[] {
    const nodeDataArray = this.diagram.model.nodeDataArray as Class[];
    const matching: Class[] = [];
    for (const node of nodeDataArray) {
      for (const [key, value] of Object.entries(filter)) {
        if (key === 'category') continue;
        if (node[key as keyof Class] === value) matching.push(node);
      }
    }
    return matching;
  }

  private findCommonMembers(parts: go.Part[]): Property[] {
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

  private updateTags(newTags: string[]) {
    newTags.forEach(tag => tags.add(tag));
  }

  abstractClasses() {
    let fmmlxClassNodes = this.diagram.selection.toArray();
    let classLevel = fmmlxClassNodes[0].data.level;
    let partCreatedHandler = (diagramEvent: go.DiagramEvent) => {
      diagramEvent.diagram.removeDiagramListener('PartCreated', partCreatedHandler);
      Helper.beginTransaction('Abstracting Selection...', 'AbsSel');

      let commonMembers = this.findCommonMembers(fmmlxClassNodes);
      for (let member of commonMembers) {
        this.addMemberToClass(diagramEvent.subject.data, member);
      }
      for (let fmmlxClassNode of fmmlxClassNodes) {
        if (fmmlxClassNode.data.level !== classLevel) {
          Helper.rollbackTransaction();
          throw new Error('All classes to be abstracted must have the same level');
        }
        this.changeMetaclass(fmmlxClassNode.data, diagramEvent.subject.data.id);
      }
      Helper.commitTransaction();
    };

    let randomName = `AbstractClass ${Helper.randomString()}`;
    let level = classLevel === '?' ? '?' : classLevel + 1;
    this.diagram.addDiagramListener('PartCreated', partCreatedHandler);
    this.createFmmlxClass(randomName, level, false);
  }

  /**
   * Adds <Property> to <fmmlxClass> and its descendants (if it does not exist)
   * Returns true if successful false otherwise
   */
  addMemberToClass(fmmlxClass: Class, member: Property): boolean {
    const transId = Helper.beginTransaction(`Adding Member to class...`, 'addMember');
    fmmlxClass.lastChangeId = transId;
    const collection = fmmlxClass.findCorrespondingCollection(member);
    const collectionName = fmmlxClass.findCorrespondingCollectionName(member);
    const oldCollection = new Set(Array.from(collection));

    member.classes.add(fmmlxClass);
    collection.add(member);
    this.diagram.model.raiseChangedEvent(
      go.ChangedEvent.Insert,
      collectionName,
      fmmlxClass,
      oldCollection,
      collection
    );
    this.processClass(fmmlxClass);
    let descendants = [...fmmlxClass.instances, ...fmmlxClass.subclasses];
    for (let descendant of descendants) {
      this.addMemberToClass(descendant, member);
    }
    Helper.commitTransaction();
    return true;
  }

  /**
   * Adds the corresponding value to a class
   * returns the value or undefined if nothing was done
   */
  addValueToClass(fmmlxClass: Class, member: Property, value?: string) {
    console.debug(`Adding a value (${value}) of ${member.name} to ${fmmlxClass.name}`);
    value = value === undefined ? Helper.randomString() : value;

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
    this.deleteMember(fmmlxClass, member);
    const val = new Value(member, value, fmmlxClass);
    const collection = fmmlxClass.findCorrespondingCollection(val);
    const oldCollection = new Set(Array.from(collection));
    const collectionName = fmmlxClass.findCorrespondingCollectionName(val);
    member.values.set(fmmlxClass, val);
    collection.add(val);
    this.diagram.model.raiseChangedEvent(
      go.ChangedEvent.Insert,
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
  changeClassLevel(fmmlxClass: Class, newLevel: number | undefined, transId: string) {
    if (fmmlxClass.lastChangeId === transId) return;
    fmmlxClass.lastChangeId = transId;
    if (newLevel === fmmlxClass.level) {
      console.debug('Change class level: Initial and target levels are the same. Doing nothing.');
      return;
    } else if (newLevel !== undefined && newLevel < 0)
      throw new Error(`Level would be negative for ${fmmlxClass.name}`);

    console.debug(`Changing ${fmmlxClass.name}'s level from ${fmmlxClass.level} to ${newLevel}`);
    const instanceLevel = newLevel === undefined ? undefined : newLevel - 1;

    /* -- Level change only works downstream
                if (fmmlxClass.metaclass !== null && fmmlxClass.lastChangeId !== transId) {
                    console.debug(`Processing metaclass ${fmmlxClass.metaclass.name}...`);
                    this.changeClassLevel(fmmlxClass.metaclass, instanceLevel, transId);
                }


                if (fmmlxClass.superclass !== null && fmmlxClass.lastChangeId !== transId) {
                    console.debug(`Processing supeclass... ${fmmlxClass.superclass.name}.`);
                    this.changeClassLevel(fmmlxClass.superclass, newLevel, transId);
                }
                */
    this.diagram.model.setDataProperty(fmmlxClass, 'level', newLevel);
    this.processClass(fmmlxClass);

    if (fmmlxClass.instances.size > 0) {
      console.debug('Processing instances...');
      for (let instance of fmmlxClass.instances) {
        this.changeClassLevel(instance, instanceLevel, transId);
      }
    }

    if (fmmlxClass.subclasses.size > 0) {
      console.debug('Processing subclasses...');
      for (let subclass of fmmlxClass.subclasses) {
        this.deleteSuperclass(subclass);
      }
    }
  }

  /**
   * Changes the metaclass of an FMMLx Class, reevaluates its properties and propagates the changes downstream
   * returns false if the change was not done, true otherwise.
   */
  changeMetaclass(fmmlxClass: Class, metaclassId: string | null = null) {
    //check for "falsy" values
    if (!metaclassId) {
      this.deleteMetaclass(fmmlxClass);
      return false;
    }

    const metaclass = this.diagram.model.findNodeDataForKey(metaclassId) as Class;
    if (fmmlxClass.isExternal) {
      throw new Error(`External classes can not have a local metaclass`);
    }

    if (fmmlxClass.metaclass !== undefined && fmmlxClass.metaclass.equals(metaclass)) {
      console.debug(`Old and new metaclasses are the same. Doing nothing.`);
      return false;
    }
    if (metaclass.level === undefined && fmmlxClass.level !== undefined)
      throw new Error(
        'Only classes with undefined meta-level may instantiate classes with unknown meta-level'
      );

    if (
      metaclass.level !== undefined &&
      fmmlxClass.level !== undefined &&
      metaclass.level !== fmmlxClass.level + 1
    ) {
      throw new Error(`Metaclass (${metaclass.name}) level must be ${fmmlxClass.level! + 1}`);
    }

    let transactionMessage = `Change ${fmmlxClass.name}'s metaclass from  ${
      fmmlxClass.metaclass === undefined ? 'Metaclass' : fmmlxClass.metaclass.name
    } to ${metaclass.name}`;
    Helper.beginTransaction(transactionMessage, 'changeMeta');
    try {
      this.deleteMetaclass(fmmlxClass);
      this.diagram.model.setDataProperty(fmmlxClass, 'metaclass', metaclass);
      metaclass.addInstance(fmmlxClass);
      let newProperties = [...metaclass.attributes, ...fmmlxClass.operations];
      for (let member of newProperties) {
        this.addMemberToClass(fmmlxClass, member);
        this.addValueToClass(fmmlxClass, member, '');
      }
    } catch (error) {
      Helper.rollbackTransaction();
      throw error;
    }
    Helper.commitTransaction();
    return true;
  }

  changeClassSuperclass(superclass: Class, subclass: Class) {
    if (superclass === null) {
      console.debug('Superclass is null, doing nothing');
      return;
    }
    if (typeof superclass.level === 'undefined' || superclass.id === subclass.id)
      throw new Error('Invalid selection');
    if (superclass.level !== subclass.level)
      throw new Error('Subclass and Superclass must have the same level.');
    if (subclass.superclass !== null)
      throw new Error('Subclass already inherits from another class.');

    let transId = Helper.beginTransaction('Creating inheritance', 'inherit');
    try {
      let members = superclass.members;
      for (let member of members) {
        this.addMemberToClass(subclass, member);
      }
      this.diagram.model.setDataProperty(subclass, 'superclass', superclass);
      superclass.addSubclass(subclass);
      let data = new Inheritance(subclass, superclass);
      (this.diagram.model as go.GraphLinksModel).addLinkData(data);
      Helper.commitTransaction();
    } catch (e) {
      Helper.commitTransaction();
      throw e;
    }
  }

  /**
   * Copies a member definition to the metaclass
   */
  copyMemberToMetaclass(fmmlxClass: Class, member: Property) {
    if (fmmlxClass.metaclass === undefined) throw new Error('Class has no defined metaclass');
    this.addMemberToClass(fmmlxClass.metaclass, member);
  }

  /**
   * Copies a member definition to the superclass
   */
  copyMemberToSuperclass(classId: string, memberId: string) {
    const fmmlxClass: Class = this.diagram.model.findNodeDataForKey(classId);
    if (fmmlxClass.superclass === undefined) throw new Error('Class has no defined superclass');
    let member = fmmlxClass.findMemberById(memberId);
    if (member.constructor === Value) member = (member as Value).property;
    this.addMemberToClass(fmmlxClass.superclass, member as Property);
  }

  /**
   * Creates an association from source to target
   */
  createAssociation(source: Class, target: Class) {
    Helper.beginTransaction(`Associating ${source.name} and ${target.name}`, 'assoc');
    let assoc = new Association(source, target, Helper.randomString(), '0,*', '0,*', 'src', 'dst');
    (this.diagram.model as go.GraphLinksModel).addLinkData(assoc);
    source.addAssociation(assoc);
    target.addAssociation(assoc);
    Helper.commitTransaction();
  }

  /**
   * Given an association, creates an instance or a refinement of it
   */
  createAssociationInstanceOrRefinement(
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
          association
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
          undefined,
          undefined,
          undefined,
          association
        );
      }
      (this.diagram.model as go.GraphLinksModel).addLinkData(assoc);
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

  /**
   * Adds a new FMMLX Class to the diagram
   */
  createFmmlxClass(
    name: string,
    level: number | undefined,
    isAbstract: boolean,
    metaclassId?: string,
    externalLanguage?: string,
    externalMetaclass?: string,
    tags: string[] = []
  ) {
    //Step 1 Search for dupes

    let fmmlxClass = new Class(name, level, isAbstract, externalLanguage, externalMetaclass, tags);
    let dupe = this.diagram.model.findNodeDataForKey(fmmlxClass.id);
    if (dupe !== null) {
      throw new Error(`An equivalent class definition already exists.`);
    }
    this.updateTags(tags);
    console.debug(`Add Class ${name}`);

    //The next click on the diagram will insert the class
    this.diagram.toolManager.clickCreatingTool.archetypeNodeData = fmmlxClass;
    this.diagram.toolManager.clickCreatingTool.isDoubleClick = false;

    let partCreatedHandler = (diagramEvent: go.DiagramEvent) => {
      diagramEvent.diagram.removeDiagramListener('PartCreated', partCreatedHandler);
      let tool = diagramEvent.diagram.toolManager.clickCreatingTool;
      tool.archetypeNodeData = null;
      tool.isDoubleClick = true;
      this.changeMetaclass(diagramEvent.subject.data, metaclassId);
    };
    //Step 3 once we have a part instance we add its metaclass
    this.diagram.addDiagramListener('PartCreated', partCreatedHandler);
  }

  /**
   * Creates an FMMLx class member and associates it to an fmmlx class
   */
  createMember(
    fmmlxClassId: string,
    name: string,
    type: string,
    intrinsicness: number | undefined,
    isOperation: boolean,
    behaviors: string[],
    isValue: string,
    value: string = '',
    operationBody?: string,
    tags: string[] = []
  ) {
    const fmmlxClass = this.diagram.model.findNodeDataForKey(fmmlxClassId);
    if (Boolean(isValue)) {
      intrinsicness = fmmlxClass.level;
    }

    let member = new Property(
      name,
      type,
      intrinsicness,
      isOperation,
      behaviors,
      operationBody,
      tags
    );

    this.addMemberToClass(fmmlxClass, member);
    if (Boolean(isValue)) {
      this.addValueToClass(fmmlxClass, member, value);
    }
    this.updateTags(tags);
  }

  /**
   * Deletes an FMMLx Association
   * returns true on success
   */
  deleteAssociation(association: Association) {
    let transId = Helper.beginTransaction(
      `Deleting association ${association.name}`,
      'deleteAssoc'
    );
    try {
      association.source.removeAssociation(association);
      association.target.removeAssociation(association);
      if (association.metaAssociation !== undefined)
        association.metaAssociation.deleteInstance(association);
      if (association.primitive !== undefined) association.primitive.deleteRefinement(association);
      this.diagram.remove(this.diagram.findLinkForData(association));
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
  deleteFmmlxClass(fmmlxClass: Class) {
    let transId = Helper.beginTransaction(`Deleting class ${fmmlxClass.name}`, 'deleteClass');
    try {
      //inheritance -  instantiation
      for (let instance of fmmlxClass.instances) {
        this.deleteMetaclass(instance);
      }
      for (let subclass of fmmlxClass.subclasses) {
        this.deleteSuperclass(subclass);
      }

      if (fmmlxClass.superclass !== undefined) fmmlxClass.superclass.removeSubclass(fmmlxClass);

      this.deleteMetaclass(fmmlxClass);

      //process own values - members
      for (let value of fmmlxClass.values) {
        this.deleteValue(fmmlxClass, value);
      }

      for (let member of fmmlxClass.members) {
        this.deleteMember(fmmlxClass, member);
      }

      let node = this.diagram.findNodeForData(fmmlxClass);
      this.diagram.remove(node);
      this.diagram.model.removeNodeData(fmmlxClass);
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
  deleteMember(
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

    this.diagram.model.raiseChangedEvent(
      ChangedEvent.Remove,
      collectionName,
      fmmlxClass,
      oldCollection,
      collection
    );
    if (member.values.has(fmmlxClass)) {
      this.deleteValueFromClass(fmmlxClass, member.values.get(fmmlxClass)!);
    }

    //del downstream
    if (downstream) {
      for (let instance of fmmlxClass.instances) {
        this.deleteMember(instance, member, false, downstream);
      }
      for (let subclass of fmmlxClass.subclasses) {
        this.deleteMember(subclass, member, false, downstream);
      }
    }

    //del upstream
    if (upstream) {
      if (fmmlxClass.superclass !== undefined) {
        this.deleteMember(fmmlxClass.superclass, member, true, false);
      }
      if (fmmlxClass.metaclass !== undefined) {
        this.deleteMember(fmmlxClass.metaclass, member, true, false);
      }
    }
    Helper.commitTransaction();
  }

  private deleteValueFromClass(fmmlxClass: Class, value: Value) {
    Helper.beginTransaction('Delete value from class');
    const collection = fmmlxClass.findCorrespondingCollection(value);
    const collectionName = fmmlxClass.findCorrespondingCollectionName(value);
    const oldCollection = new Set([...collection]);
    collection.delete(value);
    value.property.values.delete(fmmlxClass);
    delete value.property;
    delete value.class;
    this.diagram.model.raiseChangedEvent(
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
  deleteMetaclass(fmmlxClass: Class) {
    if (fmmlxClass.metaclass === undefined) {
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
        this.deleteMember(fmmlxClass, member);
      }
      this.diagram.model.setDataProperty(fmmlxClass, 'metaclass', null);
      metaclass.removeInstance(fmmlxClass);
    } catch (error) {
      Helper.rollbackTransaction();
      throw error;
    }
    Helper.commitTransaction();
    return true;
  }

  /**
   * Sets the superclass to null, removes the subclass reference from the superclass, removes inherited members and deletes the link
   */
  deleteSuperclass(subclassOrId: Class | string) {
    let subclass =
      typeof subclassOrId === 'string'
        ? this.diagram.model.findNodeDataForKey(subclassOrId)
        : subclassOrId;
    let superclass = subclass.superclass;

    superclass.removeSubclass(subclass);
    for (let member of superclass.members) {
      this.deleteMember(subclass, member);
    }
    subclass.superclass = null;
    let linkData = this.diagram
      .findLinksByExample({
        from: subclass.id,
        to: superclass.id,
        category: 'fmmlxInheritance',
      })
      .first().data;
    (this.diagram.model as go.GraphLinksModel).removeLinkData(linkData);
  }

  /**
   * Deletes (if exists) <Value> from FmmlxClass
   * Returns true if succesful, false otherwise
   */
  deleteValue(fmmlxClass: Class, value: Value) {
    console.debug(
      `Delete Value of ${value.property.name}:${value.property.type} in ${fmmlxClass.name}`
    );

    const transId = Helper.beginTransaction('Deleting value...', 'deleteValue');
    this.diagram.model.setDataProperty(fmmlxClass, 'lastChangeId', transId);
    const collection = fmmlxClass.findCorrespondingCollection(value) as Set<Value>;
    const collectionName = fmmlxClass.findCorrespondingCollectionName(value);
    collection.delete(value);
    value.property.values.delete(value.class);
    delete value.class;
    delete value.property;
    this.diagram.model.raiseChangedEvent(
      go.ChangedEvent.Insert,
      collectionName,
      fmmlxClass,
      new Set(),
      collection
    );
    Helper.commitTransaction();
  }

  editAssociation(
    assocId: string,
    name: string,
    sourceCardinality: string,
    sourceIntrinsicness: string | number,
    sourceRole: string,
    targetCardinality: string,
    targetIntrinsicness: string | number,
    targetRole: string
  ) {
    let association: Association = (this.diagram.model as go.GraphLinksModel).findLinkDataForKey(
      assocId
    );
    let transId = Helper.beginTransaction('Edit Association', 'EditAssoc');
    try {
      this.diagram.model.setDataProperty(association, 'name', name);
      this.diagram.model.setDataProperty(association, 'sourceCardinality', sourceCardinality);
      this.diagram.model.setDataProperty(association, 'sourceRole', sourceRole);
      this.diagram.model.setDataProperty(association, 'sourceIntrinsicness', sourceIntrinsicness);
      this.diagram.model.setDataProperty(association, 'targetCardinality', targetCardinality);
      this.diagram.model.setDataProperty(association, 'targetIntrinsicness', targetIntrinsicness);
      this.diagram.model.setDataProperty(association, 'targetRole', targetRole);
      Helper.commitTransaction();
    } catch (error) {
      Helper.rollbackTransaction();
      throw error;
    }
  }

  /**
   * Edits an FMMLx Class and recalculates its properties
   */
  editFmmlxClass(
    classId: string,
    name: string,
    level: number | undefined,
    isAbstract: boolean,
    metaclassId?: string,
    externalLanguage?: string,
    externalMetaclass?: string,
    tags: string[] = []
  ) {
    const fmmlxClass: Class = this.diagram.model.findNodeDataForKey(classId);
    console.debug(`Editing class ${fmmlxClass.name}`);

    metaclassId = metaclassId === '' ? undefined : metaclassId;

    if (isAbstract && fmmlxClass.instances.size > 0) {
      throw new Error('Can not make class abstract because it has instances.');
    }

    let transId = Helper.beginTransaction('Editing Class...', 'editClass');
    try {
      this.diagram.model.setDataProperty(fmmlxClass, 'isAbstract', Boolean(isAbstract));
      this.diagram.model.setDataProperty(fmmlxClass, 'name', name);

      if (externalLanguage !== fmmlxClass.externalLanguage) {
        this.diagram.model.setDataProperty(fmmlxClass, 'externalLanguage', externalLanguage);
      }
      if (externalMetaclass !== fmmlxClass.externalMetaclassName) {
        this.diagram.model.setDataProperty(fmmlxClass, 'externalMetaclass', externalMetaclass);
      }

      this.changeClassLevel(fmmlxClass, level, transId);
      //if the level changed the whole chain is refreshed and there is no need to refresh the instances
      //to reflect name changes
      /*if (!this.changeClassLevel(fmmlxClass, level)) {
                for (let instance of fmmlxClass.instances) {
                    let node =this.diagram.findNodeForData(instance);
                    node.updateTargetBindings();
                }
            }*/

      this.changeMetaclass(fmmlxClass, metaclassId);
      if (!(tags === null || tags.length === 0)) {
        fmmlxClass.tags = new Set(tags);
        tags.forEach(tag => fmmlxClass.tags.add(tag));
      }
      this.diagram.model.setDataProperty(fmmlxClass, 'lastChangeId', transId);
      Helper.commitTransaction();
    } catch (error) {
      Helper.rollbackTransaction();
      throw error;
    }
  }

  /**
   * Edits an FMMLx Attribute/ Operation / Value
   */
  editMember(
    classId: string,
    memberId: string,
    name: string,
    type: string,
    intrinsicness: string,
    behaviors: string[],
    value: string = '',
    operationBody: string | null = null,
    tags: string[] = []
  ) {
    let node = this.diagram.findNodeForKey(classId);
    let fmmlxClass: Class = node.data;
    let member = fmmlxClass.findMemberById(memberId);
    let otherAttributes = {
      name: name,
      type: type,
      behaviors: behaviors,
      operationBody: operationBody,
    };
    let transId = Helper.beginTransaction(`Edit Member`, 'editMember');
    this.updateTags(tags);

    if (member.constructor === Value) {
      (member as Value).value = value;
    } else {
      const set = this.diagram.model.setDataProperty;
      set(member, 'name', name);
      set(member, 'type', type);
      set(member, 'intrinsicness', intrinsicness);
      set(member, 'behaviors', behaviors);
      set(member, 'operationBody', operationBody);
    }
    tags.forEach(tag => member.tags.add(tag));
    this.processClass(fmmlxClass);

    /*
      this.diagram.model.setDataProperty(member, 'tags', new Set(tags));

      if (member.constructor !== Value && member.intrinsicness !== intrinsicness) {
        this.diagram.model.setDataProperty(member, 'intrinsicness', intrinsicness);

        //process each class related to the member
        let classes = (member as Property).classes.toArray().slice(0);
        let values = Array.from((member as Property).values.toArray()).slice(0);
        //just in case we make a static clone

        for (let fmmlxClass of classes) {
          if (fmmlxClass.lastChangeId !== transId) {
            this.processClass(fmmlxClass);
            this.diagram.model.setDataProperty(fmmlxClass, 'lastChangeId', transId);
          }
        }

        for (let value of values) {
          let fmmlxClass = value.class;
          if (fmmlxClass.lastChangeId !== transId) {
            this.processClass(fmmlxClass);
            this.diagram.model.setDataProperty(fmmlxClass, 'lastChangeId', transId);
          }
        }
      } else if (member.isValue === false) {
        //If the instrinsicness is unchanged, it is necessary to refresh the classes that have the edited member
        for (let fmmlxClass of member.classes) {
          let arrayName = fmmlxClass.findCorrespondingCollection(member, true);
          this.diagram.model.updateTargetBindings(fmmlxClass, arrayName);
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
  filterModel(filters: any[] = []) {
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
      for (const fmmlxClass of this.diagram.model.nodeDataArray as Class[]) {
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
      for (let fmmlxAssociation of (this.diagram.model as go.GraphLinksModel)
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
  findDescendants(fmmlxClass: Class): Class[] {
    let children: Class[] = [];

    for (let instance of fmmlxClass.instances) {
      let tmpBranch = this.findDescendants(instance);
      tmpBranch.push(instance);
      children = children.concat(tmpBranch);
    }

    for (let subclass of fmmlxClass.subclasses) {
      let tmpBranch = this.findDescendants(subclass);
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
  findRoot(fmmlxClass: Class): Class[] {
    const roots: Class[] = [];
    if (fmmlxClass.superclass === undefined && fmmlxClass.metaclass === undefined)
      roots.push(fmmlxClass);
    if (fmmlxClass.superclass !== undefined)
      this.findRoot(fmmlxClass.superclass).forEach(root => roots.push(root));
    if (fmmlxClass.metaclass !== undefined)
      this.findRoot(fmmlxClass.metaclass).forEach(root => roots.push(root));
    return roots;
  }

  /**
   * Finds the parent of each class in classes and hides all the rest
   */
  /*  findTrees(selectedClasses: Class[]): Class[] {
    let chain: Class[] = [];
    this.setNodesVisibility(false);
    // hides all classes
    for (let selectedClass of selectedClasses) {
      let roots = this.findRoot(selectedClass);
      chain.push(root);
      chain = chain.concat(this.findDescendants(root));
    }
    return chain;
  }*/

  /**
   * Changes the visibility of all nodes
   */
  setNodesVisibility(visible: boolean) {
    const transId = Helper.beginTransaction('Hiding/Showing all nodes');
    try {
      this.diagram.nodes.each(node => (node.visible = visible));
      Helper.commitTransaction(transId);
    } catch (err) {
      Helper.rollbackTransaction();
      throw err;
    }
  }

  /**
   * Returns an array of valid FmmlxClasses for refinement of a relationship.
   * Valid endpoints for *REFINEMENT* are descendants of each endpoint with *minLevel > intrinsicness*
   * Valid endpoints for *INSTANTIATION* are descendants of each endpoint with *minLevel <= intrinsicness*
   */
  findValidRelationshipClasses(
    fmmlxClass: Class,
    refinement: boolean,
    intrinsicness?: number
  ): Class[] {
    let validClasses: Class[] = [];
    const descendants = Object.freeze([...fmmlxClass.instances, ...fmmlxClass.subclasses]);

    for (const descendant of descendants) {
      if (intrinsicness === undefined) validClasses.push(descendant);
      else if (refinement && descendant.level !== undefined && descendant.level > intrinsicness)
        validClasses.push(descendant);
      else if (!refinement && descendant.level !== undefined && descendant.level <= intrinsicness)
        validClasses.push(descendant);
      validClasses = [
        ...validClasses,
        ...this.findValidRelationshipClasses(descendant, refinement, intrinsicness),
      ];
    }

    return validClasses;
  }

  /**
   *
   *@todo revisit this keeping in mind the new toJSON() methods in each of the Models.* classes
   */
  fromJSON(jsonData: string) {
    let transId = Helper.beginTransaction('Importing JSON', 'import');
    try {
      let flatData = JSON.parse(jsonData);

      while (flatData.nodes.length > 0) {
        let level = flatData.nodes.pop();
        if (Array.isArray(level)) {
          for (let data of level) {
            let node = this.inflateClass(data.data);
            node.location = go.Point.parse(data.location);
          }
        }
      }
      for (let link of flatData.links) {
        if (link.category === Inheritance.category) {
          let subclass = (this.diagram.model as go.GraphLinksModel).findLinkDataForKey(
            link.subclass
          );
          let superclass = (this.diagram.model as go.GraphLinksModel).findLinkDataForKey(
            link.superclass
          );
          this.changeClassSuperclass(superclass, subclass);
        } else if (link.category === Association.category) {
          let source = this.diagram.model.findNodeDataForKey(link.source);
          let target = this.diagram.model.findNodeDataForKey(link.target);
          let primitive =
            link.primitive !== undefined
              ? (this.diagram.model as go.GraphLinksModel).findLinkDataForKey(link.primitive)
              : null;
          let metaAssoc =
            link.metaAssociation !== undefined
              ? (this.diagram.model as go.GraphLinksModel).findLinkDataForKey(link.metaAssociation)
              : null;
          let assoc = Association.inflate(link, source, target, primitive, metaAssoc);
          (this.diagram.model as go.GraphLinksModel).addLinkData(assoc);
          link.instances.forEach((instance: any) => {
            let assocInstance: Association = (this.diagram
              .model as go.GraphLinksModel).findLinkDataForKey(instance);
            if (assocInstance !== null) {
              this.diagram.model.setDataProperty(assocInstance, 'metaAssoc', assoc);
              assoc.addInstance(assocInstance);
            }
          });
          link.refinements.forEach((refinement: any) => {
            /**
             * @type {Model.FmmlxAssociation}
             */
            let assocRefinement: Association = (this.diagram
              .model as go.GraphLinksModel).findLinkDataForKey(refinement);
            if (assocRefinement !== null) {
              this.diagram.model.setDataProperty(assocRefinement, 'primitive', assoc);
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
  getClassesByLevel(level?: number): Array<Class> {
    let targetLevel = level !== undefined ? level + 1 : undefined;
    return this.filterClasses({level: targetLevel});
  }

  /**
   * Inflates an Fmmlx Class that was deflated
   * @todo revisit this keeping in mind the new toJSON() methods in each of the Models.* classes
   */

  inflateClass(flatClass: any): any {
    let transId = Helper.beginTransaction(`Inflating ${flatClass.name}`, 'inflate');
    try {
      /**
       * @type {Model.FmmlxClass}
       */
      let fmmlxClass: Class = Class.inflate(flatClass);
      this.diagram.model.addNodeData(fmmlxClass);
      this.changeMetaclass(fmmlxClass, flatClass.metaclass);
      this.updateTags(flatClass.tags);

      if (flatClass.superclass !== null) {
        let superclass = this.diagram.model.findNodeDataForKey(flatClass.superclass);
        this.changeClassSuperclass(superclass, fmmlxClass);
      }

      for (let flatMember of flatClass.members) {
        let member = Property.inflate(flatMember);
        this.addMemberToClass(fmmlxClass, member);
        if (flatMember.tags !== undefined && flatMember.tags.length > 0)
          this.updateTags(flatMember.tags);
      }

      for (let flatValue of flatClass.values) {
        let member = Property.inflate(flatValue);
        this.addValueToClass(fmmlxClass, member, flatValue.value);
      }

      this.diagram.findNodeForKey(fmmlxClass.id).updateTargetBindings();
      Helper.commitTransaction();
      return this.diagram.findNodeForKey(fmmlxClass.id);
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
  processClass(fmmlxClass: Class) {
    console.debug(`Processing all members in ${fmmlxClass.name}`);

    const membersAndValues = [...fmmlxClass.members, ...fmmlxClass.values];
    for (let member of membersAndValues) {
      if (!member.hasDefinedIntrinsicness || !fmmlxClass.hasDefinedLevel) continue;

      if (member.intrinsicness! > fmmlxClass.level!) {
        if (member.constructor === Value) this.deleteValue(fmmlxClass, member as Value);
        else this.deleteMember(fmmlxClass, member as Property);
      } else if (member.intrinsicness! === fmmlxClass.level!) {
        if (member.constructor === Value) continue;
        this.addValueToClass(fmmlxClass, member as Property);
        this.deleteMember(fmmlxClass, member as Property);
      } else {
        if (member.constructor === Property) continue;
        this.deleteValue(fmmlxClass, member as Value);
        this.addMemberToClass(fmmlxClass, (member as Value).property);
      }
    }
    fmmlxClass.descendants.forEach(descendant => this.processClass(descendant));
  }

  /**
   * Exports the diagram as JSON
   */
  toJSON() {
    const flatData = {
      classes: new Map() as Map<string, Class>,
      associations: new Map() as Map<string, Association>,
    };
    const nodes = this.diagram.nodes;
    const links = this.diagram.links;
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

  toPNG() {
    return this.diagram.makeImageData({
      scale: 1,
      background: 'rgba(255, 255, 255, 0.8)',
    });
  }
}
