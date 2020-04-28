import * as $ from 'jquery/dist/jquery.slim';
import {StudioController, tags} from './controllers/StudioController'; //.js';
import {Helper} from './helpers/Helper'; //.js';
import {Association, Class, Property, Value} from './models/Models'; //.js';
import * as go from 'gojs/release/go-module'; //.js';
import * as M from 'materialize-css';

window.onerror = function (messageOrEvent, source, lineno, colno, errorObj) {
  error(errorObj);
};
let studio: StudioController;
let classForm: JQuery<HTMLElement>;
let propertyForm: JQuery<HTMLElement>;
let associationForm: JQuery<HTMLElement>;
$(function () {
  console.log('ready!');
});

document.addEventListener('DOMContentLoaded', (_ev: Event) => {
  studio = new StudioController();
  classForm = $('#fmmlxClassModal > form').clone();
  propertyForm = $('#fmmlxAttributeModal > form').clone();
  associationForm = $('#fmmlxAssociationModal > form').clone();

  $('#filterModal > select').formSelect();
  //just setting up selects for filter modal, every other select is done when showing the modal
  $('.fixed-action-btn').floatingActionButton();
  $('.modal').modal();

  $(document).on('keydown', event =>
    (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'i' && !event.shiftKey
      ? displayClassForm()
      : true
  );
});

function download(anchor: JQuery<HTMLAnchorElement>, data: string, fileType: string): boolean {
  let filename = `FMMLxStudio - ${new Date().toISOString()}.${fileType}`;
  anchor.prop('href', data);
  anchor.prop('download', filename);
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
function fillForm(modal: JQuery<HTMLElement>, data: any) {
  if (data === null) return;

  let fields = modal.find(':input') as JQuery<HTMLInputElement>;
  for (const field of fields) {
    const jqField = $(field);
    let fieldName = jqField.prop('name') as string;
    let value = data[fieldName];
    if (typeof value === undefined || value === null) {
      continue;
    }

    switch (jqField.prop('type')) {
      case 'checkbox':
        if (jqField.val() === value.toString()) {
          jqField.trigger('click');
          jqField.trigger('change');
        }
        break;

      case 'select-one':
        M.FormSelect.getInstance(field).destroy();
        jqField.val(value.toString());
        M.FormSelect.init(field);
        break;

      default:
        jqField.val(value);
        jqField.next('label').addClass('active');
        jqField.trigger('change');
        break;
    }
  }
}

/**
 * generic filler for a Select field. Removes all the options not marked with data-keep
 */
function fillSelect(select: JQuery<HTMLSelectElement>, options: any) {
  const instance = M.FormSelect.getInstance(select[0]);
  select.find(':not([data-keep=true])').remove();
  select.append(options);

  if (instance !== undefined) instance.destroy();
  select.formSelect();
  //.material_select();
}

/**
 * Hides and disables field and its form-group
 */
function hideField(field: JQuery<HTMLInputElement>) {
  field.prop('disabled', true);
  field.closest('.input-field').addClass('hide');
}

/**
 * Parses a form into an object. The field names are the properties of the object
 */
function readForm(form: JQuery<HTMLFormElement>) {
  let fields = form.find(':input:not([disabled])') as JQuery<HTMLInputElement>;
  let fieldData: any = {};
  for (let field of fields) {
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

  for (let field of form.find('.chips').filter(':visible')) {
    let name = field.getAttribute('name')!;
    fieldData[name] = [];
    M.Chips.getInstance(field).chipsData.forEach(tag => fieldData[name].push(tag.tag));
  }
  return fieldData;
}

function setupChip(div: any, tagList: string[] = [], options: any = {}) {
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
    $(div)
      .children('input')
      .on('blur', event => {
        //non-committed text is removed
        $(event.target).val('');
      });
  }
  tokens.forEach(token => chipsInstance.addChip(token));
}

function setupChips(form: HTMLFormElement, tags: string[] = [], options = {}) {
  for (let chipHolder of form.find('.chips')) setupChip(chipHolder, tags, options);
}

/**
 * Checks the fields that have class needsExtraInfo and sets them up according to data-show and data-hide
 */
function setupExtraDataFields(modal: JQuery) {
  modal.find('.needsExtraInfo').on('change', event => {
    let form = (event.target as HTMLInputElement).form!;
    let target = $(event.target);
    let show = typeof target.data('show') === undefined ? [] : target.data('show').split(',');
    let hide = typeof target.data('hide') === undefined ? [] : target.data('hide').split(',');
    for (let fieldName of hide) {
      let field = form.find(`#${fieldName}`);
      target.prop('checked') ? hideField(field) : showField(field);
    }
    for (let fieldName of show) {
      let field = $(`#${fieldName.trim()}`) as JQuery<HTMLInputElement>;
      target.prop('checked') ? showField(field) : hideField(field);
    }
  });
}
function showClasses(classArray: Class[]) {
  studio.showClasses(classArray);
}

/**
 * Shows and enables field and its form-group
 */
function showField(field: JQuery<HTMLInputElement>) {
  field.prop('disabled', false);
  field.closest('.input-field').removeClass('hide');
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
  const modal = $('#fmmlxClassModal');
  const form = modal.find('form') as JQuery<HTMLFormElement>;

  try {
    if (!form[0].checkValidity())
      throw new Error('Invalid input. Check the highlighted fields and try again.');

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
  } catch (error) {
    let submitBtn = modal.find('.btn-flat');
    submitBtn.one('click', addEditFmmlxClass);
    //modal.find(':input').keydown((e) => e.key.toLowerCase() === "enter" ? submitBtn.click() : true);
    error(error);
    return;
  }
  modal.modal('close');
}

export function addEditFmmlxClassMember() {
  const modal = $('#fmmlxAttributeModal');
  const form = modal.find('form') as JQuery<HTMLFormElement>;
  if (!form[0].checkValidity()) {
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
    let submitBtn = modal.find('.btn-flat');
    submitBtn.one('click', addEditFmmlxClassMember);
    modal
      .find(':input')
      .one('keydown', e => (e.key!.toLowerCase() === 'enter' ? submitBtn.trigger('click') : true));
    error(error);
    return;
  }
  modal.modal('close');
  let another = modal.find('.addAnother').prop('checked');
  if (another) {
    window.setTimeout(() => displayMemberForm(null, formVals.fmmlxClassId), 500);
  }
}

export function cloneFilterRow(filterRow: JQuery<HTMLInputElement>) {
  let newId = `_${Helper.randomString()}`;

  let newRow = filterRow.clone(true);

  //replace old chips
  for (let chipHolder of newRow.find('.chips')) {
    let name = chipHolder.getAttribute('name')!.replace(/(_.*|$)/, newId);
    //rename of chip fields
    let newHolder = document.createElement('DIV');
    newHolder.setAttribute('name', name);
    newHolder.classList.add('chips');
    chipHolder.replaceWith(newHolder);
  }

  //rename of input fields
  for (let input of newRow.find('input')) {
    if (input.id !== '') {
      let label = newRow.find(`[for=${input.id}]`);
      if (label.length > 0) label.prop('for', label.prop('for').replace(/(_.*|$)/, newId));
      input.name = input.name.replace(/(_.*|$)/, newId);
      input.id = input.id.replace(/(_.*|$)/, newId);
    }
  }

  newRow.insertAfter(filterRow);
  setupChips(newRow[0].form!, [], {
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
export function createAssociationInstanceOrRefinement(
  fmmlxAssociation: Association,
  refinement: boolean
) {
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
      $('.toast-action').one('click', () =>
        Helper.diagram!.removeDiagramListener('ObjectSingleClicked', handlerTgt)
      );
    }
  };
  Helper.diagram!.addDiagramListener('ObjectSingleClicked', handlerSrc);
  showFilterToast();
  $('.toast-action').one('click', () =>
    Helper.diagram!.removeDiagramListener('ObjectSingleClicked', handlerSrc)
  );
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
  let modal = $('#fmmlxAssociationModal');

  modal.find('form').replaceWith(associationForm.clone());
  modal.find('select').formSelect();
  setupExtraDataFields(modal);
  const dataObj = {...association, ...{src: association.source.name, tgt: association.target.name}};
  fillForm(modal, dataObj);

  if (association.isInstance) {
    modal.find('#association_sourceIntrinsicness').prop('disabled', 'disabled').parent().hide();
    modal.find('#association_targetIntrinsicness').prop('disabled', 'disabled').parent().hide();
  }

  let submitBtn = modal.find('.btn-flat');
  submitBtn.off('click', editFmmlxAssociation).one('click', editFmmlxAssociation);
  modal
    .find(':input')
    .remove('keydown')
    .on('keydown', e => (e.key!.toLowerCase() === 'enter' ? submitBtn.trigger('click') : true));
  modal.modal('open');
}

export function displayClassForm(obj?: Class) {
  let modal = $('#fmmlxClassModal') as JQuery<HTMLFormElement>;
  modal.find('form').replaceWith(classForm.clone(true));
  modal.find('select').formSelect();
  setupExtraDataFields(modal);

  $('#class_level').on('change', function (event) {
    let metaClassSelect = $('#class_metaclass') as JQuery<HTMLSelectElement>;
    if (!metaClassSelect.prop('disabled')) {
      const levelStr = (event.target as HTMLInputElement).value;
      const level = levelStr === '?' ? undefined : Number.parseFloat(levelStr);
      let options = [];
      for (let fmmlxClass of studio.getClassesByLevel(level)) {
        if (fmmlxClass.id !== modal.find(`[name=id]`).val()) {
          options.push(new Option(fmmlxClass.name, fmmlxClass.id));
        }
      }
      fillSelect(metaClassSelect, options);
    }
  });

  let tags: string[] = [];
  if (obj !== undefined) {
    fillForm(modal, obj.deflate());
    //its called with deflate so no references are made, only ids are preserved and fields can be filled
    tags = [...obj.tags];
  }

  $('#addClass').removeClass('pulse');
  setupSubmitButton(modal, addEditFmmlxClass, tags);
}

function prepareClassContextMenu(target: Class) {
  const menu = $('#classMenu');
  $('#inherit')
    .off('click')
    .one('click', () => createInheritance(target));
  $('#associate')
    .off('click')
    .one('click', () => createAssociation(target));
  $('#deleteClass')
    .off('click')
    .one('click', () => deleteClass(target));
  $('#abstractClass')
    .off('click')
    .one('click', () => abstractClass());
  $('#addMember')
    .off('click')
    .one('click', () => displayMemberForm(target));
  $('#filterChain')
    .off('click')
    .one('click', () => filterChains(Helper.diagram!.selection));
  return menu;
}

function preparePropertyContextMenu(property: Property, fmmlxClass: Class) {
  const menu = $('#propertyMenu');
  $('#deleteMemberUpstream')
    .off('click')
    .one('click', () => deleteMemberUpstream(fmmlxClass, property));
  $('#deleteMember')
    .off('click')
    .one('click', () => deleteMember(fmmlxClass, property));
  $('#toMetaclass')
    .off('click')
    .one('click', () => copyMemberToMetaclass(fmmlxClass, property));
  $('#toSuperclass')
    .off('click')
    .one('click', () => copyMemberToSuperclass(fmmlxClass, property));
  return menu;
}

function prepareAssociationContextMenu(association: Association) {
  const menu = $('#associationMenu');
  let refine = $('#refineAssociation');
  let instantiate = $('#instantiateAssociation');
  if ((association as Association).isInstance) {
    refine.hide();
    instantiate.hide();
  } else {
    refine.show();
    instantiate.show();
  }
  $('#deleteAssociation')
    .off('click')
    .one('click', () => deleteAssociation(association));
  instantiate
    .off('click')
    .one('click', () => createAssociationInstanceOrRefinement(association, false));
  refine.off('click').one('click', () => createAssociationInstanceOrRefinement(association, true));
  return menu;
}

function prepareInheritanceContextMenu(fmmlxClass: Class) {
  // Inheritance has no model because its just a plain link
  const menu = $('#inheritanceMenu');
  $('#deleteInheritance')
    .off('click')
    .one('click', () => deleteSuperclass(fmmlxClass));
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
  let menu;
  let contextMenus = $('.contextMenu');
  contextMenus.hide();
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
  let width = menu.css('width');
  menu
    .css({
      top: mouseEvent.pageY,
      left: mouseEvent.pageX + 5,
      display: 'block',
      width: 0,
    })
    .animate(
      {
        width: width,
      },
      300,
      'swing'
    );

  $('body,canvas').one('click', () => contextMenus.hide());
}

/**
 * Sets up and displays the filters
 */
export function displayFilterForm() {
  const modal = $('#filterModal') as JQuery<HTMLFormElement>;
  modal.show();
  setupChips(modal[0], [], {
    autocompleteOnly: true,
  });

  modal
    .find('.more')
    .off()
    .on('click', e => {
      const filterRow = $(e.target).parents('.filterRow') as JQuery<HTMLInputElement>;
      cloneFilterRow(filterRow);
    });

  modal
    .find('.less')
    .off()
    .on('click', e => {
      let filterRow = $(e.target).parents('.filterRow');
      filterRow.remove();
    });
  modal
    .find('.modal-action')
    .off()
    .on('click', _e => filterModel());
  modal.modal('open');
}

function setupSubmitButton(modal: JQuery<any>, callback: Function, tags: any[]) {
  let submitBtn = modal.find('.btn-flat');
  submitBtn.off('click', callback()).one('click', callback());
  modal
    .find(':input')
    .remove('keydown')
    .one('keydown', e =>
      e.key!.toLowerCase() === 'enter' && $('.chips.focus').length === 0
        ? submitBtn.trigger('click')
        : true
    );
  const modalForm = modal.find('form')[0] as HTMLFormElement;
  setupChips(modalForm, tags);
  modal.modal('open');
}

export function displayMemberForm(obj: any, id?: string) {
  const modal = $('#fmmlxAttributeModal') as JQuery<any>;
  modal.find('form').replaceWith(propertyForm.clone());
  setupExtraDataFields(modal);
  modal.find('select').formSelect();

  let opBodyManager = function () {
    let opBody = modal.find('[name=operationBody]') as JQuery<HTMLInputElement>;
    modal.find('[name=isOperation]').prop('checked') &&
    !modal.find('[name=isValue]').prop('checked')
      ? showField(opBody)
      : hideField(opBody);
  };

  $('[name=isOperation]').on('change', opBodyManager);
  modal.find('[name=isValue]').on('change', opBodyManager);
  let tags = [];

  if (obj === null || obj.constructor === Class) {
    /*new property,it was right click on  the Class*/
    id = id === undefined ? obj!.id : id;
    modal.find('[name=fmmlxClassId]').val(id!);
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

    $('#attribute_isValue').on('click', () => false);
    $('#attribute_isOperation').on('click', () => false);
    delete obj.data.isObtainable;
    delete obj.data.isDerivable;
    delete obj.data.isSimulation;
    delete obj.data.fmmlxClassId;
  }
  setupSubmitButton(modal, addEditFmmlxClassMember, tags);
}

export function downloadImage() {
  let data = studio.toPNG() as string;
  let fileType = 'png';
  let anchor = $('#image') as JQuery<HTMLAnchorElement>;
  return download(anchor, data, fileType);
}

export function editFmmlxAssociation() {
  const modal = $('#fmmlxAssociationModal');
  const form = modal.find('form') as JQuery<HTMLFormElement>;

  if (!form[0].checkValidity()) {
    let submitBtn = modal.find('.btn-flat');
    submitBtn.one('click', editFmmlxAssociation);
    modal
      .find(':input')
      .on('keydown', e => (e.key!.toLowerCase() === 'enter' ? submitBtn.trigger('click') : true));
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

  modal.modal('close');
}

export function exportJson() {
  let data = `data:text/plain;UTF-8,${encodeURIComponent(studio.toJSON())}`;
  let fileType = 'txt';
  let anchor = $('#export') as JQuery<HTMLAnchorElement>;
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

export function doFilter(matches: any) {
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
  let modal = $('#filterModal'),
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
  $(modal.modal('close');*/
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
  let toastElement = $('.filterMessage').parent()[0];
  M.Toast.getInstance(toastElement).dismiss();
  M.toast({
    html: 'All filters have been reset',
  });
}

export function showFilterToast() {
  let toastContent = 'Filters Updated!',
    timeOut = 4000;

  if ($('.filterMessage').length === 0) {
    toastContent =
      '<span class="filterMessage">There are active Filters</span><button class="btn-flat toast-action" onclick="resetFilters()">Reset Filters</button>';
    timeOut = Infinity;
  }
  M.toast({
    html: toastContent,
    displayLength: timeOut,
  });
}
