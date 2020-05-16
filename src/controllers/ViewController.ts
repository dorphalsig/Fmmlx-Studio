import * as studio from './StudioController';

import * as M from 'materialize-css';
import {Behaviours, Property} from '../models/Property';
import {ShapeEventType} from '../shapes/shapeEvents';
import {IShapeMouseEvent} from '../helpers/Interfaces';
import {Association} from '../models/Association';
import {Inheritance} from '../models/Inheritance';
import {Value} from '../models/Value';
import {Class} from '../models/Class';

let classForm: HTMLFormElement;
let propertyForm: HTMLFormElement;
let associationForm: HTMLFormElement;
let canvasDiv: HTMLDivElement;

window.onerror = function (messageOrEvent, source, lineno, colno, errorObj) {
  error(errorObj);
};

window.addEventListener('DOMContentLoaded', _e => init());

function setupEventListeners() {
  const buttons = new Map<string, Function>([
    ['#addClass', displayClassForm],
    ['#export', exportJson],
    ['#image', downloadImage],
    // ['fa-filter', displayFilterForm],
  ]);
  buttons.forEach((value, key) =>
    document.querySelector(key)!.addEventListener('click', _evt => value())
  );
  document.getElementById('importFile')!.addEventListener('click', _e => importJson());
  canvasDiv.addEventListener(ShapeEventType.shapeDblclick, e =>
    displayShapeForms((e as IShapeMouseEvent).shape)
  );
  canvasDiv.addEventListener(ShapeEventType.shapeContextmenu, e =>
    displayShapeContextMenus(e as IShapeMouseEvent)
  );
}

function displayShapeForms(shape: Class | Association | Inheritance | Property | Value) {
  switch (shape.constructor) {
    case Association:
      displayAssociationForm(shape as Association);
      break;
    case Class:
      displayClassForm(shape as Class);
      break;
    case Property:
    case Value:
      displayMemberForm(shape as Property | Value);
      break;
  }
}

function setupMaterialize() {
  M.FormSelect.init(document.querySelectorAll('#filterModal > select'));
  M.FloatingActionButton.init(document.querySelectorAll('.fixed-action-btn'));
  //just setting up selects for filter modal, every other select is done when showing the modal
  M.Modal.init(document.querySelectorAll('.modal'));
  document.addEventListener('keydown', event => {
    (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'i' && !event.shiftKey
      ? displayClassForm()
      : true;
  });
}

function init() {
  canvasDiv = document.querySelector<HTMLDivElement>('#canvas')!;
  classForm = document.querySelector('#fmmlxClassModal form')!.cloneNode(true) as HTMLFormElement;
  propertyForm = document
    .querySelector('#fmmlxAttributeModal form')!
    .cloneNode(true) as HTMLFormElement;
  associationForm = document
    .querySelector('#fmmlxAssociationModal form')!
    .cloneNode(true) as HTMLFormElement;
  setupMaterialize();
  setupEventListeners();
  studio.init(canvasDiv);
}

function download(anchor: HTMLAnchorElement, data: string, fileType: string): boolean {
  let filename = `FMMLxStudio - ${new Date().toISOString()}.${fileType}`;
  anchor.href = data;
  anchor.download = filename;
  return true;
}

function error(error?: Error) {
  if (error !== undefined) {
    M.toast({
      html: `<h6 class="lime-text text-accent-1"><strong>ERROR!</strong></h6>&nbsp; ${error.message}`,
    });
    console.log('\n***********************************');
    console.log(error);
    return;
  }
  // alert.hide();
}

/**
 * Generic form filler
 */
function fillForm(modal: HTMLElement, data: any) {
  if (data === null) return;

  let fields = modal.querySelectorAll<HTMLInputElement>(':scope input')!;
  fields.forEach(field => {
    let fieldName = field.name;
    let value = data[fieldName] as string;
    if (typeof value === undefined || value === null) return;

    switch (field.type) {
      case 'checkbox':
        if (field.value === value) {
          field.click(); // this triggers change
          field.dispatchEvent(new Event('change'));
        }
        break;

      case 'select-one':
        M.FormSelect.getInstance(field).destroy();
        field.value = value;
        M.FormSelect.init(field);
        break;

      default:
        field.value = value;
        while (field.nextElementSibling != null) {
          field = field.nextElementSibling as HTMLInputElement;
          if (field.matches('label')) break;
        }
        field.classList.add('active');
        field.dispatchEvent(new Event('change'));
        break;
    }
  });
}

/**
 * generic filler for a Select field. Removes all the options not marked with data-keep
 */
function setupSelect(select: HTMLSelectElement, options: HTMLOptionElement[] = []) {
  const instance = M.FormSelect.getInstance(select);
  const removableOptions = select.querySelectorAll(':not([data-keep=true])');
  removableOptions.forEach(option => {
    option.remove();
  });
  options.forEach(option => select.append(option));

  if (instance !== undefined) instance.destroy();
  M.FormSelect.init(select);
}

/**
 * Hides and disables field and its form-group
 */
function hideField(field: HTMLInputElement | HTMLSelectElement) {
  field.disabled = true; // ('disabled', true);
  field.closest('.input-field')!.classList.add('hide');
}

/**
 * Parses the form values into a Map.
 * chips and select multiple are arrays
 */
function readForm(form: HTMLFormElement) {
  let fieldData = new Map<string, string | string[]>();
  const fieldSelector = 'input[name]:not([disabled]):not([style*="display:none"])';
  for (const field of form.querySelectorAll<HTMLInputElement>(fieldSelector)) {
    if (field.type === 'checkbox' && !field.checked) continue;
    if (field.value === '') continue;
    fieldData.set(field.name, field.value);
  }
  for (const field of form.querySelectorAll<HTMLElement>('.chips:not([style*="display:none"])')) {
    const tags: string[] = [];
    M.Chips.getInstance(field).chipsData.forEach(tag => tags.push(tag.tag));
    fieldData.set(field.dataset.name!, tags);
  }
  return fieldData;
}

function setupChip(div: HTMLDivElement, tagList: string[] = [], options: any = {}) {
  const chipsInstance = M.Chips.getInstance(div);
  if (chipsInstance !== undefined) chipsInstance.destroy();

  const tokens: any = [];
  const autoCompleteData: any = {};
  for (const tag of tagList) {
    tokens.push({tag: tag});
  }
  for (const tag of studio.tags) {
    autoCompleteData[tag] = null;
  }

  const defaultOptions: any = {
    data: tokens,
    placeholder: 'Enter a tag',
    secondaryPlaceholder: '+Tag',
    limit: Infinity,
    autocompleteOptions: {
      limit: Infinity,
      minLength: 1,
      data: autoCompleteData,
    },
  };
  M.Chips.init(div, {
    ...defaultOptions,
    ...{options},
  });
  div
    .querySelector('input')!
    .addEventListener('blur', ev => ((ev.target as HTMLInputElement).value = ''));
}

function setupChips(form: HTMLElement, tags: string[] = [], options = {}) {
  form
    .querySelectorAll('.chips')
    .forEach(chipHolder => setupChip(chipHolder as HTMLDivElement, tags, options));
}

/**
 * Checks the fields that have class needsExtraInfo and sets them up according to data-show and data-hide
 */
function setupExtraDataFields(modal: HTMLElement) {
  modal.querySelectorAll('.needsExtraInfo').forEach(item =>
    item.addEventListener('change', event => {
      let target = event.target! as HTMLInputElement;
      let form = target.form!;
      let show =
        typeof target.getAttribute('data-show') === null
          ? []
          : target.getAttribute('data-show')!.split(',');
      let hide =
        typeof target.getAttribute('data-hide') === null
          ? []
          : target.getAttribute('data-hide')!.split(',');
      for (let fieldName of hide) {
        let field = form.querySelector(`#${fieldName}`)! as HTMLInputElement;
        target.checked ? hideField(field) : showField(field);
      }
      for (let fieldName of show) {
        let field = document.getElementById(fieldName.trim()) as HTMLInputElement;
        target.checked ? showField(field) : hideField(field);
      }
    })
  );
}

/**
 * Shows and enables field and its form-group
 */
function showField(field: HTMLInputElement) {
  field.disabled = false;
  field.closest('.input-field')!.classList.remove('hide');
}

export async function abstractClass() {
  try {
    M.toast({
      html: 'Click on the canvas to insert the class',
    });
    const point = await new Promise<{x: number; y: number}>(resolve =>
      canvasDiv.addEventListener('click', ev => resolve({x: ev.offsetX, y: ev.offsetY}), {
        once: true,
      })
    );
    studio.abstractClasses(point);
  } catch (e) {
    error(e);
  }
}

export async function addEditClass() {
  const modalDiv = document.getElementById('fmmlxClassModal')! as HTMLDivElement;
  const form = modalDiv.querySelector('form')! as HTMLFormElement;
  const submitButton = modalDiv.querySelector<HTMLButtonElement>('.modal-action')!;
  const modal = M.Modal.getInstance(modalDiv);
  submitButton.disabled = true;
  if (!form.checkValidity()) {
    submitButton.disabled = false;
    error(new Error('Invalid input. Please check and try again'));
  }
  modal.close();

  const formVals = readForm(form);

  if (!formVals.has('id')) {
    M.toast({
      html: 'Click on the canvas to insert the class',
    });
    const point = await new Promise<{x: number; y: number}>(resolve => {
      canvasDiv.addEventListener(
        'click',
        evt => {
          resolve({x: (evt as MouseEvent).offsetX, y: (evt as MouseEvent).offsetY});
        },
        {once: true}
      );
    });
    const level = formVals.has('level') ? Number.parseFloat(formVals.get('level') as string) : null;
    const extLanguage = formVals.has('externalLanguage')
      ? (formVals.get('externalLanguage') as string)
      : null;
    const extMClass = formVals.has('externalMetaclass')
      ? (formVals.get('externalLanguage') as string)
      : null;
    const tags = formVals.has('tags') ? new Set(formVals.get('tags') as string[]) : undefined;
    studio.createClass(
      point,
      formVals.get('name') as string,
      level,
      formVals.has('isAbstract'),
      formVals.get('metaclass') as string,
      extLanguage,
      extMClass,
      tags
    );
    return;
  }

  /*
  const confirmMessage =
    'Please note that changing classification level can possibly break the instantiation and' +
    ' the inheritance chain. Do you wish to continue?';
  if (!confirm(confirmMessage)) {
    modal.close();
    return;
  }
*/
  studio.editFmmlxClass(
    formVals.get('id') as string,
    formVals.get('name') as string,
    formVals.has('level') ? parseFloat(formVals.get('level') as string) : null,
    formVals.has('isAbstract'),
    formVals.get('metaclass') as string,
    formVals.has('externalLanguage') ? (formVals.get('externalLanguage') as string) : null,
    formVals.has('externalMetaclass') ? (formVals.get('externalMetaclass') as string) : null,
    formVals.has('tags') ? (formVals.get('tags') as string[]) : undefined
  );
}

export function addEditClassMember() {
  const modalDiv = document.getElementById('fmmlxAttributeModal')! as HTMLDivElement;
  const form = modalDiv.querySelector('form')! as HTMLFormElement;
  const submitButton = form.querySelector<HTMLButtonElement>('.modal-action')!;
  submitButton.disabled = true;

  if (!form.checkValidity()) {
    submitButton.disabled = false;
    error(new Error('Invalid input. Check the highlighted fields and try again.'));
  }

  let formVals = readForm(form);
  const intrinsicness =
    formVals.get('intrinsicness') === '?'
      ? null
      : parseFloat(formVals.get('intrinsicness') as string);

  const behaviors: Behaviours = {
    derivable: formVals.has('isDerivable'),
    obtainable: formVals.has('isObtainable'),
    simulation: formVals.has('isSimulation'),
  };

  if (formVals.has('id')) {
    studio.createMember(
      formVals.get('fmmlxClassId') as string,
      formVals.get('name') as string,
      formVals.get('type') as string,
      intrinsicness,
      formVals.has('isOperation'),
      behaviors,
      formVals.get('isValue') as string,
      formVals.get('value') as string,
      formVals.get('operationBody') as string,
      new Set(formVals.get('tags') as string[])
    );
  } else {
    studio.editMember(
      formVals.get('fmmlxClassId') as string,
      formVals.get('id') as string,
      formVals.get('name') as string,
      formVals.get('type') as string,
      intrinsicness,
      behaviors,
      formVals.get('value') as string,
      formVals.get('operationBody') as string,
      new Set(formVals.get('tags') as string[])
    );
  }

  if ((modalDiv.querySelector('.addAnother')! as HTMLInputElement).checked) {
    displayMemberForm(null, formVals.get('fmmlxClassId') as string);
  }
}
/*
export function cloneFilterRow(filterRow: HTMLInputElement) {
  let newId = `_${Helper.randomString()}`;

  let newRow = filterRow.cloneNode(true) as HTMLInputElement;
  newRow.querySelectorAll('.chips').forEach(chipHolder => {
    //replace old chips
    let name = chipHolder.getAttribute('name')!.replace(/(_.*|$)/, newId);
    //rename of chip fields
    let newHolder = document.createElement('DIV');
    newHolder.setAttribute('name', name);
    newHolder.classList.add('chips');
    chipHolder.replaceWith(newHolder);
  });
  newRow.querySelectorAll<HTMLInputElement>('input').forEach(input => {
    if (input.id === '') return;
    const label = newRow.querySelector<HTMLLabelElement>(`[for=${input.id}]`);
    if (label !== null) label.htmlFor = label.htmlFor.replace(/(_.*|$)/, newId);
    input.name = input.name.replace(/(_.*|$)/, newId);
    input.id = input.id.replace(/(_.*|$)/, newId);
  });
  //rename of input fields
  filterRow.insertAdjacentElement('afterend', newRow);
  setupChips(newRow.form!, [], {
    autocompleteOnly: true,
  });
}*/

function getClickedShape(
  shapeType: typeof Class | Property | Value | Inheritance | Association
): Promise<Class | Property | Value | Inheritance | Association> {
  return new Promise(resolve => {
    const listener = (e: Event) => {
      const shape = (e as IShapeMouseEvent).shape;
      if (shape.constructor === shapeType) {
        resolve(shape);
        e.target!.removeEventListener(ShapeEventType.shapeClick, listener);
      }
    };
    canvasDiv.addEventListener(ShapeEventType.shapeClick, listener);
  });
}

async function actionCreateAssociation() {
  M.toast({html: 'Select the source class'});
  const source = (await getClickedShape(Class)) as Class;
  M.toast({html: 'Select the target class'});
  const target = (await getClickedShape(Class)) as Class;
  const assoc = studio.createAssociation(source, target);
  displayAssociationForm(assoc);
}

/**
 * Given an association, creates an instance (refinement) of it
 */
async function createInstanceOrRefinement(association: Association, refinement: boolean) {
  let toast = M.toast({
    html: 'Choose source',
  });
  studio.setNodesVisibility(false);
  const validSources = studio.findValidRelationshipClasses(
    association.source,
    refinement,
    association.sourceIntrinsicness
  );
  studio.showClasses(validSources);
  const source = (await getClickedShape(Class)) as Class;
  toast.dismiss();

  studio.setNodesVisibility(false);
  const validTargets = studio.findValidRelationshipClasses(
    association.target,
    refinement,
    association.targetIntrinsicness
  );
  studio.showClasses(validTargets);
  showFilterToast();
  toast = M.toast({
    html: 'Choose target...',
  });
  const target = (await getClickedShape(Class)) as Class;
  const assoc = studio.createAssociationInstanceOrRefinement(
    association,
    source,
    target,
    refinement
  );
  toast.dismiss();
  resetFilters();
  displayAssociationForm(assoc);
}

async function createInheritance(subclass: Class) {
  const toast = M.toast({
    html: 'Select the superclass',
  });
  const sup = (await getClickedShape(Class)) as Class;
  studio.changeSuperclass(sup, subclass);
  toast.dismiss();
}

/**
 * Deletes an FMMLx Class
 *
 */
function deleteClass(fmmlxClass: Class) {
  try {
    studio.deleteFmmlxClass(fmmlxClass);
  } catch (e) {
    error(e);
  }
}

/**
 * Deletes the member definition everywhere.
 */
function deleteMemberEverywhere(fmmlxClass: Class, member: Property) {
  try {
    studio.deleteMember(fmmlxClass, member, true, true);
  } catch (e) {
    error(e);
  }
}

/**
 * Deletes the member definition upstream - that means from the metaclass upwards
 */
function deleteMemberUpstream(fmmlxClass: Class, member: Property) {
  try {
    studio.deleteMember(fmmlxClass, member, true, false);
  } catch (e) {
    error(e);
  }
}

function displayAssociationForm(association: Association) {
  document.getElementById('addClass')!.classList.remove('pulse');
  const div = document.getElementById('fmmlxAssociationModal')!;
  div.querySelector('form')!.replaceWith(associationForm.cloneNode(true));
  M.FormSelect.init(div.querySelector('select')!);
  setupExtraDataFields(div);
  const dataObj = {...association, ...{src: association.source.name, tgt: association.target.name}};
  fillForm(div, dataObj);

  if (association.isInstance) {
    const sourceInt = div.querySelector<HTMLInputElement>('#association_sourceIntrinsicness')!;
    sourceInt.disabled = true;
    sourceInt.parentElement!.style.display = 'none';
    const targetInt = div.querySelector<HTMLInputElement>('#association_targetIntrinsicness')!;
    sourceInt.disabled = true;
    targetInt.parentElement!.style.display = 'none';
  }

  let submitBtn = div.querySelector<HTMLInputElement>('.btn-flat')!;
  submitBtn.addEventListener('click', editFmmlxAssociation, {once: true});
  submitBtn.addEventListener(
    'keydown',
    event => ((event as KeyboardEvent).key.toLowerCase() === 'enter' ? submitBtn.click() : true),
    {once: true}
  );
  M.Modal.getInstance(div).open();
}

function displayClassForm(fmmlxClass?: Class) {
  document.getElementById('addClass')!.classList.remove('pulse');
  const modal = document.getElementById('fmmlxClassModal')! as HTMLDivElement;
  modal.querySelector('form')!.replaceWith(classForm.cloneNode(true));
  setupExtraDataFields(modal);

  const classLevel = modal.querySelector<HTMLInputElement>('#class_level')!;
  const classLevelChangeHandler = (event: Event) => {
    let metaClassSelect = modal.querySelector<HTMLSelectElement>('#class_metaclass')!;
    if (!metaClassSelect.disabled) {
      const levelStr = (event.target as HTMLInputElement).value;
      const level = levelStr === '?' ? null : Number.parseFloat(levelStr);
      let options = [];
      for (let fmmlxClass of studio.getClassesByLevel(level)) {
        const idField = modal.querySelector<HTMLInputElement>(`[name=id]`)!;
        if (fmmlxClass.id !== idField.value) {
          options.push(new Option(fmmlxClass.name, fmmlxClass.id));
        }
      }
      setupSelect(metaClassSelect, options);
    }
  };
  classLevel.addEventListener('change', changeEvent => classLevelChangeHandler(changeEvent));
  let tags: string[] = [];
  if (fmmlxClass !== undefined) {
    fillForm(modal, fmmlxClass.deflate());
    //its called with deflate so no references are made, only ids are preserved and fields can be filled
    tags = [...fmmlxClass.tags];
  }
  M.FormSelect.init(modal.querySelector('select')!);
  setupChips(modal, tags);

  modal.querySelector('.modal-action')!.addEventListener('click', () => addEditClass());
  modal.querySelector<HTMLFormElement>('form')!.addEventListener('submit', event => {
    event.preventDefault();
    addEditClass();
  });
  M.Modal.getInstance(modal).open();
}

function setupClassContextMenu(classObject: Class) {
  const menu = document.getElementById('classMenu')!;
  const listeners = new Map<string, Function>([
    ['#inherit', createInheritance],
    ['#associate', actionCreateAssociation],
    ['#deleteClass', deleteClass],
    ['#abstractClass', abstractClass],
    ['#addMember', displayMemberForm],
    //['#filterChain', filterChains],
  ]);

  listeners.forEach((callback: Function, selector) =>
    menu
      .querySelector(selector)!
      .addEventListener('click', _evt => callback(classObject), {once: true})
  );

  return menu;
}

function setupPropertyContextMenu(propertyObject: Property, classObject: Class) {
  const menu = document.getElementById('propertyMenu')!;

  const listeners = new Map<string, Function>([
    ['#deleteMemberUpstream', deleteMemberUpstream],
    ['#deleteMember', deleteMemberEverywhere],
    ['#toMetaclass', studio.copyMemberToMetaclass],
    ['#toSuperclass', studio.copyMemberToSuperclass],
  ]);
  listeners.forEach((callback: Function, selector) =>
    menu
      .querySelector(selector)!
      .addEventListener('click', _evt => callback(classObject, propertyObject), {once: true})
  );

  return menu;
}

function setupAssociationContextMenu(association: Association) {
  const menu = document.getElementById('associationMenu')!;
  const del = menu.querySelector<HTMLElement>('deleteAssociation')!;
  const refine = menu.querySelector<HTMLElement>('#refineAssociation')!;
  const instantiate = menu.querySelector<HTMLElement>('#instantiateAssociation')!;

  if ((association as Association).isInstance) {
    refine.style.display = 'none';
    instantiate.style.display = 'none';
  } else {
    refine.style.display = 'block';
    instantiate.style.display = 'none';
  }
  del.addEventListener('click', _ev => studio.deleteAssociation(association), {once: true});
  refine.addEventListener('click', _ev => createInstanceOrRefinement(association, true), {
    once: true,
  });
  instantiate.addEventListener('click', _ev => createInstanceOrRefinement(association, false), {
    once: true,
  });
  return menu;
}

function setupInheritanceContextMenu(inheritance: Inheritance) {
  const menu = document.getElementById('inheritanceMenu')!;
  menu
    .querySelector<HTMLElement>('#deleteInheritance')!
    .addEventListener('click', _ev => deleteClass(inheritance.superclass));
  return menu;
}

function displayShapeContextMenus(event: IShapeMouseEvent) {
  let menu: HTMLElement;
  //hide all other context menus
  /*  document
    .querySelectorAll<HTMLDivElement>('.contextMenu')
    .forEach(menu => menu.classList.remove('visibleContextMenu'));*/

  switch (event.shape.constructor) {
    case Class:
      console.debug('Class');
      menu = setupClassContextMenu(event.shape as Class);
      break;
    case Property:
      const classObject = studio.getClassAt({x: event.offsetX, y: event.offsetY});
      menu = setupPropertyContextMenu(event.shape as Property, classObject);
      break;
    case Association:
      menu = setupAssociationContextMenu(event.shape as Association);
      break;
    case Value:
      return;
    default:
      menu = setupInheritanceContextMenu(event.shape as Inheritance);
      break;
  }

  menu.style.cssText = `position: absolute; top: ${event.pageY}px; left: ${event.pageX + 5}px;`;
  menu.classList.add('visibleContextMenu');
  window.addEventListener('click', () => menu.classList.remove('visibleContextMenu'), {once: true});
}

/**
 * Sets up and displays the filters
 */
/*
export function displayFilterForm() {
  const modal = document.getElementById('filterModal')!;
  modal.style.display = 'block';
  setupChips(modal, [], {
    autocompleteOnly: true,
  });
  modal.querySelectorAll('.more').forEach(element =>
    element.addEventListener('click', e => {
      const filterRow = (e.target as HTMLElement)!.closest<HTMLInputElement>('.filterRow')!;
      cloneFilterRow(filterRow);
    })
  );

  modal.querySelectorAll('.less').forEach(element =>
    element.addEventListener('click', e => {
      const filterRow = (e.target as HTMLElement)!.closest<HTMLInputElement>('.filterRow')!;
      filterRow.remove();
    })
  );

  modal.querySelectorAll('.modal-action').forEach(_element => filterModel());
  M.Modal.getInstance(modal).open();
}*/

function displayMemberForm(obj: any, id?: string) {
  document.getElementById('addClass')!.classList.remove('pulse');
  const modal = document.getElementById('fmmlxAttributeModal') as HTMLDivElement;
  modal.querySelector('form')!.replaceWith(propertyForm.cloneNode());
  setupExtraDataFields(modal);
  setupSelect(modal.querySelector('select')!);

  let showHideOpBodyField = function () {
    const opBody = modal.querySelector<HTMLInputElement>('[name=operationBody]')!;
    (modal.querySelector('[name=isOperation]') as HTMLInputElement)!.checked &&
    !(modal.querySelector('[name=isValue]') as HTMLInputElement)!.checked
      ? showField(opBody)
      : hideField(opBody);
  };

  modal.querySelector('[name=isOperation]')!.addEventListener('change', showHideOpBodyField);
  modal.querySelector('[name=isValue]')!.addEventListener('change', showHideOpBodyField);
  let tags = [];

  if (obj === null || obj.constructor === Class) {
    /*new property,it was right click on  the Class*/
    id = id === undefined ? obj!.id : id;

    modal.querySelector<HTMLInputElement>('[name=fmmlxClassId]')!.value = id!;
    /* id of the Fmmlx Class that will hold the property+*/
  } else {
    if (!obj.data.isValue) {
      obj.data.behaviors.forEach((behavior: string) => {
        switch (behavior) {
          case 'O':
            obj.data.isObtainable = 'O';
            break;
          case 'D':
            obj.data.isDerivable = 'D';
            break;
          case 'S':
            obj.data.isSimulation = 'S';
            break;
        }
      });
    }

    obj.data.fmmlxClassId = obj.part.data.id;
    fillForm(modal, obj.data);
    tags = obj.data.tags;

    modal.querySelector('#attribute_isValue')!.addEventListener('click', () => false);
    modal.querySelector('#attribute_isOperation')!.addEventListener('click', () => false);
    delete obj.data.isObtainable;
    delete obj.data.isDerivable;
    delete obj.data.isSimulation;
    delete obj.data.fmmlxClassId;
  }
  modal.querySelector('.modal-action')!.addEventListener('click', () => addEditClass());
  modal.querySelector<HTMLFormElement>('form')!.addEventListener('submit', event => {
    event.preventDefault();
    addEditClassMember();
  });
  setupChips(modal, tags);
  M.Modal.getInstance(modal).open();
}

function downloadImage() {
  let data = studio.toPNG() as string;
  let fileType = 'png';
  let anchor = document.getElementById('image') as HTMLAnchorElement;
  return download(anchor, data, fileType);
}

function editFmmlxAssociation() {
  const modal = document.getElementById('fmmlxAssociationModal') as HTMLDivElement;
  const form = modal.querySelector<HTMLFormElement>('form')!;

  if (!form.checkValidity()) {
    //setupSubmitButton(modal, editFmmlxAssociation);
    error(new Error('Invalid input. Check the highlighted fields and try again.'));
  }
  const formVals = readForm(form);
  studio.editAssociation(
    formVals.get('id') as string,
    formVals.get('name') as string,
    formVals.get('sourceCardinality') as string,
    formVals.get('sourceIntrinsicness') as string,
    formVals.get('sourceRole') as string,
    formVals.get('targetCardinality') as string,
    formVals.get('targetIntrinsicness') as string,
    formVals.get('formVals.targetRole') as string
  );
  M.Modal.getInstance(modal).close();
}

function exportJson() {
  let data = `data:text/plain;UTF-8,${encodeURIComponent(studio.toJSON())}`;
  let fileType = 'txt';
  let anchor = document.getElementById('export') as HTMLAnchorElement;
  return download(anchor, data, fileType);
}

/**
 * Shows only the inheritance trees of the selected classes
 */
/*function filterChains(selection: go.Set<go.Part>) {
  showFilterToast();
  let classes: Class[] = [];
  selection.each(part => classes.push(part.data));
  studio.showClasses(studio.findTrees(classes));
}*/

/*
export function doFilter(matches: any) {
  let transId = Helper.beginTransaction('Filtering Model...');
    for (let association of matches.associations) {
      diagram.findLinkForData(association).visible = false;
    }

    for (let fmmlxClass of matches.classes) {
      diagram.findNodeForData(fmmlxClass).visible = false;
    }

    for (let match of matches.members) {
      let fmmlxClass = match[0];

      let node = diagram.findNodeForData(fmmlxClass);

      if (node === null) throw new Error(`Could not find node for ${fmmlxClass.name}.`);

      for (let member of match[1]) {
        let section, valueSection;
        if (member.isOperation) {
          section = node.findObject('operations');
          valueSection = node.findObject('operationValues');
        } else {
          section = node.findObject('attributes');
          valueSection = node.findObject('attributeValues');
        }

        section.findObject('ellipsis').visible = true;
        let propertyShape = section.findObject('items').findItemPanelForData(member);
        if (propertyShape !== null) propertyShape.visible = false;

        let value = member.getValueByClass(fmmlxClass);
        if (value !== undefined) {
          let section = node.findObject('operationValues');
          let propertyShape = section.findObject('items').findItemPanelForData(value);
          if (propertyShape !== null) propertyShape.visible = false;
        }
      }
    }
    Helper.commitTransaction(transId);
}
*/

/**
 * @todo redo this. It should work so:
 * Filtering can be done to classes and/or associations and/or members.
 * Different forms should be shown for each filter type. tags can be applied to classes, associations, members or any
 * combination of the above.
 * This is moved to Stage 3. - after the live models
 */
/*
export function filterModel() {
  let modal = jQuery('#filterModal'),
    suffixes = new Set(['']),
    filters: {operator:string,tags:string,levels:string[] }[] = [];
  let data = readForm(modal.find('form') as JQuery<HTMLFormElement>);
  Object.getOwnPropertyNames(data).forEach(name => {
    if (name.indexOf('_') !== -1) suffixes.add('_' + name.split('_')[1]);
  });
  suffixes.forEach(suffix => {
    filters.push({
      operator: data[`operator${suffix}`],
      tags: data[`tags${suffix}`],
      levels: data[`levels${suffix}`] === '' ? [] : data[`levels${suffix}`].split(/[^\d]+/),
    });
  });
  let matches = filterModel(filters);
  doFilter(matches);
  showFilterToast();
  jQuery(modal.modal('close');
}
*/

function importJson() {
  let reader = new FileReader();
  reader.onload = () => {
    let json = reader.result as string;
    studio.fromJSON(json);
  };
  const form = document.getElementById('importFile') as HTMLFormElement;
  reader.readAsText(form.files[0]);
}

/**
 * Resets all filters, showing all classes
 */
export function resetFilters() {
  studio.setNodesVisibility(true);
  // Show Everything

  let toastElement = document.querySelector('.filterMessage')!.parentElement!;
  M.Toast.getInstance(toastElement).dismiss();
  M.toast({
    html: 'All filters have been reset',
  });
}

function showFilterToast() {
  let toastContent = 'Filters Updated!',
    timeOut = 4000;

  if (document.querySelector('.filterMessage') === null) {
    toastContent =
      '<span class="filterMessage">There are active Filters</span><button class="btn-flat toast-action" onclick="resetFilters()">Reset Filters</button>';
    timeOut = Infinity;
  }
  M.toast({
    html: toastContent,
    displayLength: timeOut,
  });
}
