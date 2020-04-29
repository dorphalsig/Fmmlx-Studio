import {StudioController, tags} from './controllers/StudioController'; //.js';
import {Helper} from './helpers/Helper'; //.js';
import {Association, Class, Property, Value} from './models/Models'; //.js';
import * as go from 'gojs/release/go-module'; //.js';
import * as M from 'materialize-css';

let studio: StudioController;
let classForm: HTMLFormElement;
let propertyForm: HTMLFormElement;
let associationForm: HTMLFormElement;
document.addEventListener('DOMContentLoaded', _e => init());

function init() {
  window.onerror = function (messageOrEvent, source, lineno, colno, errorObj) {
    error(errorObj);
  };

  studio = new StudioController();
  classForm = document.querySelector('#fmmlxClassModal > form')!.cloneNode() as HTMLFormElement;
  propertyForm = document
    .querySelector('#fmmlxAttributeModal > form')!
    .cloneNode() as HTMLFormElement;
  associationForm = document
    .querySelector('#fmmlxAssociationModal > form')!
    .cloneNode() as HTMLFormElement;

  M.FormSelect.init(document.querySelectorAll('#filterModal > select'));
  M.FloatingActionButton.init(document.querySelectorAll('.fixed-action-btn'));
  //just setting up selects for filter modal, every other select is done when showing the modal
  M.Modal.init(document.querySelectorAll('.modal'));
  document.addEventListener('keydown', event => {
    (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'i' && !event.shiftKey
      ? displayClassForm()
      : true;
  });
  const buttons = new Map<string, Function>([
    ['#addClass', displayClassForm],
    // ['#export', exportJson],
    // ['#image', downloadImage],
    // ['fa-filter', displayFilterForm],
  ]);
  buttons.forEach((value, key) =>
    document.querySelector(key)!.addEventListener('click', _evt => value())
  );
  document.getElementById('importFile')!.addEventListener('click', _e => importJson());
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

  let fields = modal.querySelectorAll<HTMLInputElement>(':scope :input')!;
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
 * Parses a form into an object. The field names are the properties of the object
 */
function readForm(form: HTMLFormElement) {
  let fieldData: any = {};
  (form.querySelectorAll(':input:not([disabled])') as NodeListOf<HTMLInputElement>).forEach(
    field => {
      let name = field.getAttribute('name');
      if (name !== '') {
        fieldData[`${name}`] =
          (field.type === 'checkbox' && field.checked) || field.type !== 'checkbox'
            ? field.value
            : '';
      } else {
        fieldData[`${name}`] = field.value;
      }
    }
  );
  form.querySelectorAll('.chips').forEach(chip => {
    if (!chip.matches(':visible')) return;
    const name = chip.getAttribute('name')!;
    fieldData[name] = [];
    M.Chips.getInstance(chip).chipsData.forEach(tag => fieldData[name].push(tag.tag));
  });
  return fieldData;
}

function setupChip(div: HTMLDivElement, tagList: string[] = [], options: any = {}) {
  const tokens: {tag: string}[] = [],
    autoCompleteData: any = {};
  const defaultOptions = {
    placeholder: 'Enter a tag',
    secondaryPlaceholder: '+Tag',
    limit: Infinity,
    autocompleteOptions: {
      limit: Infinity,
      minLength: 1,
      data: autoCompleteData,
    },
  };

  tags.forEach(tag => (autoCompleteData[tag] = null));
  // formats all the existing tags for the autocomplete
  tagList.forEach(tag => {
    tags.add(tag);
    tokens.push({
      tag: tag,
    });
    // formats the tokens
    autoCompleteData[tag] = null;
    // formats the autoselect options
  });

  options = Object.assign({}, defaultOptions, options);
  let chipsInstance = M.Chips.getInstance(div);
  div.dataset.initialized = 'true';

  if (chipsInstance === undefined) {
    chipsInstance = M.Chips.init(div, options);

    div
      .querySelector('input')!
      .addEventListener('blur', ev => ((ev.target as HTMLInputElement).value = ''));
  }
  tokens.forEach(token => chipsInstance.addChip(token));
}

function setupChips(form: HTMLFormElement, tags: string[] = [], options = {}) {
  for (let chipHolder of form.find('.chips')) setupChip(chipHolder, tags, options);
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
          : target.getAttribute('hide')!.split(',');
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

function showClasses(classArray: Class[]) {
  studio.showClasses(classArray);
}

/**
 * Shows and enables field and its form-group
 */
function showField(field: HTMLInputElement) {
  field.disabled = false;
  field.closest('.input-field')!.classList.remove('hide');
}

export function abstractClass() {
  try {
    studio.abstractClasses();
    M.toast({
      html: 'Click on the canvas to insert the class',
    });
  } catch (e) {
    error(e);
  }
}

export function addEditFmmlxClass() {
  const modal = document.getElementById('fmmlxClassModal')! as HTMLDivElement;
  const form = modal.querySelector('form')! as HTMLFormElement;

  if (!form.checkValidity()) {
    setupSubmitButton(modal, addEditFmmlxClass);
    error(new Error('Invalid input. Please check and try again'));
  }

  let formVals = readForm(form);
  if (formVals.id === '') {
    studio.createFmmlxClass(
      formVals.name,
      formVals.level,
      formVals.isAbstract,
      formVals.metaclass,
      formVals.externalLanguage,
      formVals.externalMetaclass,
      formVals.tags
    );
    M.toast({
      html: 'Click on the canvas to insert the class',
    });
  } else if (
    confirm(
      'Please note that changing classification level can possibly break the instantiation and the inheritance chain.\nDo you wish to continue?'
    )
  ) {
    studio.editFmmlxClass(
      formVals.id,
      formVals.name,
      formVals.level,
      formVals.isAbstract,
      formVals.metaclass,
      formVals.externalLanguage,
      formVals.externalMetaclass,
      formVals.tags
    );
  }

  M.Modal.getInstance(modal).close();
}

export function addEditFmmlxClassMember() {
  const modal = document.getElementById('fmmlxAttributeModal')! as HTMLDivElement;
  const form = modal.querySelector('form')! as HTMLFormElement;
  if (!form.checkValidity()) {
    throw new Error('Invalid input. Check the highlighted fields and try again.');
  }

  let formVals = readForm(form);

  formVals.behaviors = [];

  if (formVals.isObtainable !== undefined && formVals.isObtainable.length > 0) {
    formVals.behaviors.push(formVals.isObtainable);
  }
  if (formVals.isDerivable !== undefined && formVals.isDerivable.length > 0) {
    formVals.behaviors.push(formVals.isDerivable);
  }
  if (formVals.isSimulation !== undefined && formVals.isSimulation.length > 0) {
    formVals.behaviors.push(formVals.isSimulation);
  }

  try {
    if (formVals.id === '') {
      studio.createMember(
        formVals.fmmlxClassId,
        formVals.name,
        formVals.type,
        formVals.intrinsicness,
        formVals.isOperation,
        formVals.behaviors,
        formVals.isValue,
        formVals.value,
        formVals.operationBody,
        formVals.tags
      );
    } else {
      studio.editMember(
        formVals.fmmlxClassId,
        formVals.id,
        formVals.name,
        formVals.type,
        formVals.intrinsicness,
        formVals.behaviors,
        formVals.value,
        formVals.operationBody,
        formVals.tags
      );
    }
  } catch (error) {
    setupSubmitButton(modal, addEditFmmlxClassMember);
    error(error);
    return;
  }
  M.Modal.getInstance(modal).close();
  if ((modal.querySelector('.addAnother')! as HTMLInputElement).checked) {
    window.setTimeout(() => displayMemberForm(null, formVals.fmmlxClassId), 500);
  }
}

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
}

export function copyMemberToMetaclass(fmmlxClass: Class, member: Property) {
  try {
    studio.copyMemberToMetaclass(fmmlxClass, member);
  } catch (e) {
    error(e);
  }
}

export function copyMemberToSuperclass(fmmlxClass: Class, member: Property) {
  try {
    studio.copyMemberToSuperclass(fmmlxClass, member);
  } catch (e) {
    error(e);
  }
}

export async function createAssociation(source?: Class): Promise<void> {
  if (!source) {
    M.toast({html: 'Select the source class'});
    const source = (await studio.getClicked()) as Class;
    return createAssociation(source);
  }
  M.toast({html: 'Select the target class'});
  const target = (await studio.getClicked()) as Class;
  studio.createAssociation(source, target);
}

/**
 * Given an association, creates an instance (refinement) of it
 */
export function createInstanceOrRefinement(fmmlxAssociation: Association, refinement: boolean) {
  let instanceSrc: Class, instanceTgt: Class;

  let toast = M.toast({
    html: 'Choose source',
  });
  studio.setNodesVisibility(false);
  let validDescendants = studio.findValidRelationshipClasses(
    fmmlxAssociation.source,
    refinement,
    fmmlxAssociation.sourceIntrinsicness
  );
  showClasses(validDescendants);
  let handlerSrc = function (event: go.DiagramEvent) {
    if (event.subject.part.constructor === Node) {
      Helper.diagram!.removeDiagramListener('ObjectSingleClicked', handlerSrc);
      toast.dismiss();
      instanceSrc = event.subject.part.data;
      toast = M.toast({
        html: 'Choose target',
      });
      studio.setNodesVisibility(false);
      let validDescendants = studio.findValidRelationshipClasses(
        fmmlxAssociation.target,
        refinement,
        fmmlxAssociation.targetIntrinsicness
      );
      showClasses(validDescendants);
      let handlerTgt = function (event: go.DiagramEvent) {
        if (event.subject.part.constructor === Node) {
          Helper.diagram!.removeDiagramListener('ObjectSingleClicked', handlerTgt);
          studio.setNodesVisibility(true);
          instanceTgt = event.subject.part.data;
          studio.createAssociationInstanceOrRefinement(
            fmmlxAssociation,
            instanceSrc,
            instanceTgt,
            refinement
          );
        }
      };
      Helper.diagram!.addDiagramListener('ObjectSingleClicked', handlerTgt);
      document.querySelectorAll('.toast-action').forEach(element =>
        element.addEventListener('click', evt => {
          Helper.diagram!.removeDiagramListener('ObjectSingleClicked', handlerTgt);
          Helper.diagram!.removeDiagramListener('ObjectSingleClicked', handlerSrc);
        })
      );
    }
  };
  Helper.diagram!.addDiagramListener('ObjectSingleClicked', handlerSrc);
  showFilterToast();
}

export function createInheritance(subclass: Class) {
  M.toast({
    html: 'Select the superclass',
  });
  let handler = function (event: go.DiagramEvent) {
    try {
      Helper.diagram!.removeDiagramListener('ObjectSingleClicked', handler);
      let superclass = event.subject.part.data;
      studio.changeClassSuperclass(superclass, subclass);
    } catch (err) {
      error(err);
    }
  };

  Helper.diagram!.addDiagramListener('ObjectSingleClicked', handler);
}

export function deleteAssociation(assoc: Association) {
  try {
    studio.deleteAssociation(assoc);
  } catch (err) {
    error(err);
  }
}

/**
 * Deletes an FMMLx Class
 *
 */
export function deleteClass(fmmlxClass: Class) {
  try {
    studio.deleteFmmlxClass(fmmlxClass);
  } catch (e) {
    error(e);
  }
}

/**
 * Deletes the member definition everywhere.
 */
export function deleteMember(fmmlxClass: Class, member: Property) {
  try {
    studio.deleteMember(fmmlxClass, member, true, true);
  } catch (e) {
    error(e);
  }
}

/**
 * Deletes the member definition upstream - that means from the metaclass upwards
 */
export function deleteMemberUpstream(fmmlxClass: Class, member: Property) {
  try {
    studio.deleteMember(fmmlxClass, member, true, false);
  } catch (e) {
    error(e);
  }
}

export function deleteSuperclass(fmmlxClass: Class) {
  studio.deleteSuperclass(fmmlxClass);
}

export function displayAssociationForm(association: Association) {
  document.getElementById('addClass')!.classList.remove('pulse');
  const div = document.getElementById('#fmmlxAssociationModal')!;
  const associationForm = div.querySelector<HTMLFormElement>('form')!;
  div.querySelector('form')!.replaceWith(associationForm.cloneNode(true));
  M.FormSelect.init(div.querySelector('select')!);
  setupExtraDataFields(div);
  const dataObj = {...association, ...{src: association.source.name, tgt: association.target.name}};
  fillForm(div, dataObj);

  if (association.isInstance) {
    const sourceInt = div.querySelector<HTMLInputElement>('#association_sourceIntrinsicness')!;
    sourceInt.setAttribute('disabled', 'disabled');
    sourceInt.parentElement!.style.display = 'none';
    const targetInt = div.querySelector<HTMLInputElement>('#association_targetIntrinsicness')!;
    targetInt.setAttribute('disabled', 'disabled');
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

export function displayClassForm(fmmlxClass?: Class) {
  document.getElementById('addClass')!.classList.remove('pulse');
  const modal = document.getElementById('#fmmlxClassModal')! as HTMLDivElement;
  modal.querySelector('form')!.replaceWith(classForm.cloneNode(true));
  M.FormSelect.init(modal.querySelector('select')!);
  setupExtraDataFields(modal);

  const classLevel = modal.querySelector<HTMLInputElement>('#class_Level')!;
  const classLevelChangeHandler = (event: Event) => {
    let metaClassSelect = modal.querySelector<HTMLSelectElement>('#class_metaclass')!;
    if (!metaClassSelect.disabled) {
      const levelStr = (event.target as HTMLInputElement).value;
      const level = levelStr === '?' ? undefined : Number.parseFloat(levelStr);
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

  setupSubmitButton(modal, addEditFmmlxClass);
  const modalForm = modal.querySelector<HTMLFormElement>('form')!;
  setupChips(modalForm, tags);
  M.Modal.getInstance(modal).open();
}

function prepareClassContextMenu(classObject: Class) {
  const menu = document.getElementById('classMenu')!;
  const listeners = new Map<string, Function>([
    ['#inherit', createInheritance],
    ['#associate', createAssociation],
    ['#deleteClass', deleteClass],
    ['#abstractClass', abstractClass],
    ['#addMember', displayMemberForm],
    ['#filterChain', filterChains],
  ]);

  listeners.forEach((callback: Function, selector) =>
    menu
      .querySelector(selector)!
      .addEventListener('click', _evt => callback(classObject), {once: true})
  );

  return menu;
}

function preparePropertyContextMenu(propertyObject: Property, classObject: Class) {
  const menu = document.getElementById('propertyMenu')!;

  const listeners = new Map<string, Function>([
    ['#deleteMemberUpstream', deleteMemberUpstream],
    ['#deleteMember', deleteMember],
    ['#toMetaclass', copyMemberToMetaclass],
    ['#toSuperclass', copyMemberToSuperclass],
  ]);
  listeners.forEach((callback: Function, selector) =>
    menu
      .querySelector(selector)!
      .addEventListener('click', _evt => callback(classObject, propertyObject), {once: true})
  );

  return menu;
}

function prepareAssociationContextMenu(association: Association) {
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
  del.addEventListener('click', _ev => deleteAssociation(association), {once: true});
  refine.addEventListener('click', _ev => createInstanceOrRefinement(association, true), {
    once: true,
  });
  instantiate.addEventListener('click', _ev => createInstanceOrRefinement(association, false), {
    once: true,
  });
  return menu;
}

function prepareInheritanceContextMenu(fmmlxClass: Class) {
  // Inheritance has no model because its just a plain link
  const menu = document.getElementById('inheritanceMenu')!;
  menu
    .querySelector<HTMLElement>('#deleteInheritance')!
    .addEventListener('click', _ev => deleteSuperclass(fmmlxClass));
  return menu;
}

export function displayContextMenu({
  mouseEvent,
  target1,
  target2,
}: {
  mouseEvent: MouseEvent;
  target1?: Class | Property | Association | Value;
  target2?: Class | Property | Association | Value;
}) {
  document.getElementById('addClass')!.classList.remove('pulse');
  let menu;
  let contextMenus = document.querySelectorAll<HTMLElement>('.contextMenu');
  contextMenus.forEach(menu => (menu.style.display = 'none'));
  const condition = target1 !== undefined ? target1.constructor : undefined;
  switch (condition) {
    case Class:
      menu = prepareClassContextMenu(target1 as Class);
      break;
    case Property:
      menu = preparePropertyContextMenu(target1 as Property, target1 as Class);
      break;
    case Association:
      menu = prepareAssociationContextMenu(target1 as Association);
      break;
    case Value:
      return;
    default:
      menu = prepareInheritanceContextMenu(target2 as Class);
      break;
  }

  let width = menu!.style.width;
  const listeners = new Map<string, any>([
    ['top', mouseEvent.pageY],
    ['left', mouseEvent.pageX + 5],
    ['display', 'block'],
    ['width', 0],
  ]);
  menu.animate({width: width, easing: 'ease-in'}, 300);

  document
    .querySelector('body')!
    .addEventListener('click', _ev => contextMenus.forEach(menu => (menu.style.display = 'none')), {
      once: true,
    });

  document
    .querySelector('canvas')!
    .addEventListener('click', _ev => contextMenus.forEach(menu => (menu.style.display = 'none')), {
      once: true,
    });
}

/**
 * Sets up and displays the filters
 */
export function displayFilterForm() {
  const modal = document.getElementById('filterModal')!;
  modal.style.display = 'block';
  setupChips(modal.querySelector<HTMLFormElement>('form')!, [], {
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

  modal.querySelectorAll('.modal-action').forEach(element => filterModel());
  M.Modal.getInstance(modal).open();
}

function setupSubmitButton(modal: HTMLDivElement, callback: Function) {
  let submitBtn = modal.querySelector<HTMLInputElement>('.btn-flat')!;
  submitBtn.addEventListener('click', callback(), {once: true});
  modal.querySelectorAll(':input').forEach(element =>
    element.addEventListener(
      'keydown',
      evt => {
        if ((evt as KeyboardEvent).key.toLowerCase() === 'enter') submitBtn.click();
      },
      {once: true}
    )
  );
}

export function displayMemberForm(obj: any, id?: string) {
  document.getElementById('addClass')!.classList.remove('pulse');
  const modal = document.getElementById('fmmlxAttributeModal') as HTMLDivElement;
  modal.querySelector('form')!.replaceWith(propertyForm.clone());
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
  setupSubmitButton(modal, addEditFmmlxClassMember);
  const modalForm = modal.querySelector<HTMLFormElement>('form')!;
  setupChips(modalForm, tags);
  M.Modal.getInstance(modal).open();
}

export function downloadImage() {
  let data = studio.toPNG() as string;
  let fileType = 'png';
  let anchor = document.getElementById('image') as HTMLAnchorElement;
  return download(anchor, data, fileType);
}

export function editFmmlxAssociation() {
  const modal = document.getElementById('fmmlxAssociationModal') as HTMLDivElement;
  const form = modal.querySelector<HTMLFormElement>('form')!;

  if (!form.checkValidity()) {
    setupSubmitButton(modal, editFmmlxAssociation);
    error(new Error('Invalid input. Check the highlighted fields and try again.'));
  }
  const formVals = readForm(form);
  studio.editAssociation(
    formVals.id,
    formVals.name,
    formVals.sourceCardinality,
    formVals.sourceIntrinsicness,
    formVals.sourceRole,
    formVals.targetCardinality,
    formVals.targetIntrinsicness,
    formVals.targetRole
  );
  M.Modal.getInstance(modal).close();
}

export function exportJson() {
  let data = `data:text/plain;UTF-8,${encodeURIComponent(studio.toJSON())}`;
  let fileType = 'txt';
  let anchor = document.getElementById('export') as HTMLAnchorElement;
  return download(anchor, data, fileType);
}

/**
 * Shows only the inheritance trees of the selected classes
 */
export function filterChains(selection: go.Set<go.Part>) {
  showFilterToast();
  let classes: Class[] = [];
  selection.each(part => classes.push(part.data));
  showClasses(studio.findTrees(classes));
}

export function doFilter(/*matches: any*/) {
  alert('Not implemented');
  throw new Error('Not implemented');
  /*  let transId = Helper.beginTransaction('Filtering Model...');

                                                      for (let association of matches.associations) {
                                                        Helper.diagram!.findLinkForData(association).visible = false;
                                                      }

                                                      for (let fmmlxClass of matches.classes) {
                                                        Helper.diagram!.findNodeForData(fmmlxClass).visible = false;
                                                      }

                                                      for (let match of matches.members) {
                                                        let fmmlxClass = match[0];

                                                        let node = Helper.diagram!.findNodeForData(fmmlxClass);

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
                                                      Helper.commitTransaction(transId);*/
}

/**
 * @todo redo this. It should work so:
 * Filtering can be done to classes, associations and tags.
 * Different forms should be shown for each filter type. tags can be applied to classes, associations, members or any
 * combination of the above.
 * This is moved to Stage 3. - after the live models
 */
export function filterModel() {
  /*
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
                                                      let matches = studio.filterModel(filters);
                                                      doFilter(matches);
                                                      showFilterToast();
                                                      jQuery(modal.modal('close');*/
  alert("We're remodelling. Please check back later.");
}

export function importJson() {
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

export function showFilterToast() {
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
