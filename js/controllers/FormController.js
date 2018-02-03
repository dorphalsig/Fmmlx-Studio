"use strict";
(typeof Controller === "undefined") ? window.Controller = {} : "";

Controller.FormController = class {

    static __download(anchor, data, fileType) {
        let filename = `FMMLxStudio - ${new Date().toISOString()}.${fileType}`;
        anchor.prop("href", data);
        anchor.prop("download", filename);
        return true;
    }

    static __error(error = undefined) {

        if (typeof error !== "undefined") {
            Materialize.toast(`<h6 class="lime-text text-accent-1"><strong>ERROR!</strong></h6>&nbsp; ${error.message}`, 6000);
            console.log("\n***********************************");
            console.log(error);
            return;
        }
        alert.hide();
    }

    /**
     * Generic form filler
     * @param {JQuery} modal window
     * @param data
     * @private
     */
    static __fillForm(modal, data) {
        if (data === null)
            return;

        let fields = modal.find(":input");
        for (let field of fields) {
            field = $(field);
            let fieldName = field.prop("name");
            let value = data[fieldName];
            if (typeof value === "undefined") {
                continue;
            }
            if (field.prop("type") === "checkbox") {
                if (field.val() === value.toString()) {
                    field.click();
                    field.change();
                }
            } else {
                field.val(value);
                field.click();
                field.change();
            }
        }
    }

    /**
     * generic filler for a Select field. Removes all the options not marked with data-keep
     * @param {HTMLOptionElement[]} options
     * @param {JQuery} select
     * @private
     */
    static __fillSelect(select, options) {
        select.find(":not([data-keep=true])").remove();
        select.append(options);
        select.material_select();
    }

    /**
     * Hides and disables field and its form-group
     * @param {JQuery} field
     * @private
     */
    static __hideField(field) {
        field.prop("disabled", true);
        field.closest(".input-field").addClass("hide");
    }

    /**
     * Parses a form into an object. The field names are the properties of the object
     * @param {JQuery} form
     * @returns {Object}
     * @private
     */
    static __readForm(form) {
        let fields = form.find(":input:not([disabled])");
        let fieldData = {};
        for (let field of fields) {
            let name = field.name;
            if (name !== "") {
                fieldData[`${name}`] = ((field.type === "checkbox" && field.checked) || field.type !== "checkbox") ? field.value : "";
            } else {
                fieldData[`${name}`] = field.value;
            }
        }
        fieldData.tags = [];
        let chipField = form.find(".chips");
        if (chipField.length > 0) {
            chipField.material_chip('data').forEach(tag => fieldData.tags.push(tag.tag));
        }
        return fieldData;
    }

    /**
     * Checks the fields that have class needsExtraInfo and sets them up according to data-show and data-hide
     * @param {JQuery} modal
     * @private
     */
    static __setupExtraDataFields(modal) {
        let self = this;
        modal.find(".needsExtraInfo").change(function (event) {
            let form = $(event.target.form);
            let target = $(event.target);
            let show = typeof target.data("show") === "undefined" ? [] : target.data("show").split(",");
            let hide = typeof target.data("hide") === "undefined" ? [] : target.data("hide").split(",");
            for (let fieldName of hide) {
                let field = form.find(`#${fieldName}`);
                target.prop("checked") ? self.__hideField(field) : self.__showField(field);
            }
            for (let fieldName of show) {
                let field = $(`#${fieldName.trim()}`);
                target.prop("checked") ? self.__showField(field) : self.__hideField(field);
            }
        });
    }

    static __setupChips(form, tags = []) {
        let currentTags = [];
        let tagsData = {};
        tags.forEach(tag => currentTags.push({tag: tag}));

        studio.tags.forEach(item => Object.defineProperty(tagsData, item, {
            value: null,
            writable: false,
            enumerable: true
        }));

        form.find('.chips').material_chip({
            placeholder: 'Enter a tag',
            secondaryPlaceholder: '+Tag',
            data: currentTags,
            autocompleteOptions: {
                data: tagsData,
                limit: Infinity,
                minLength: 1
            }
        });

    }


    /**
     * Shows and enables field and its form-group
     * @param {JQuery} field
     * @private
     */
    static __showField(field) {
        field.prop("disabled", false);
        field.closest(".input-field").removeClass("hide");
    }

    static abstractClass() {
        let self = Controller.FormController;
        try {
            studio.abstractClasses();
            Materialize.toast("Click on the canvas to insert the class", 4000);

        } catch (e) {
            self.__error(e);
        }
    }

    static addEditFmmlxClass() {
        const self = Controller.FormController;
        const modal = $("#fmmlxClassModal");
        const form = modal.find("form");

        try {
            if (!form[0].checkValidity()) throw new Error("Invalid input. Check the highlighted fields and try again.");

            let formVals = self.__readForm(form);
            if (formVals.id === "") {
                studio.createFmmlxClass(formVals.name, formVals.level, formVals.isAbstract, formVals.metaclass, formVals.externalLanguage, formVals.externalMetaclass, formVals.tags);
                Materialize.toast("Click on the canvas to insert the class", 4000);
            } else {
                studio.editFmmlxClass(formVals.id, formVals.name, formVals.level, formVals.isAbstract, formVals.metaclass, formVals.externalLanguage, formVals.externalMetaclass, formVals.tags);
            }

        } catch (error) {
            let submitBtn = modal.find(".btn-flat");
            submitBtn.one("click", self.addEditFmmlxClass);
            //modal.find(':input').keydown((e) => e.key.toLowerCase() === "enter" ? submitBtn.click() : true);
            self.__error(error);
            return false;
        }
        modal.modal("close");
    }

    static addEditFmmlxClassMember() {
        const self = Controller.FormController;
        const modal = $("#fmmlxAttributeModal");
        const form = modal.find("form");
        try {
            if (!form[0].checkValidity()) {
                throw new Error("Invalid input. Check the highlighted fields and try again.");
            }

            let formVals = self.__readForm(form);
            formVals.behaviors = [];

            if (formVals.isObtainable.length > 0) {
                formVals.behaviors.push(formVals.isObtainable);
            }
            if (formVals.isDerivable.length > 0) {
                formVals.behaviors.push(formVals.isDerivable);
            }
            if (formVals.isSimulation.length > 0) {
                formVals.behaviors.push(formVals.isSimulation);
            }

            if (formVals.id === "") {
                studio.createMember(formVals.fmmlxClassId, formVals.name, formVals.type, formVals.intrinsicness, formVals.isOperation, formVals.behaviors, formVals.isValue, formVals.value, formVals.operationBody);
            } else {
                studio.editMember(formVals.fmmlxClassId, formVals.id, formVals.name, formVals.type, formVals.intrinsicness, formVals.behaviors, formVals.value, formVals.operationBody);
            }
        } catch (error) {
            let submitBtn = modal.find(".btn-flat");
            submitBtn.one("click", self.addEditFmmlxClassMember);
            modal.find(":input").one('keydown', (e) => e.key.toLowerCase() === "enter" ? submitBtn.click() : true);
            self.__error(error);
            return;
        }

        modal.modal("close");
    }

    static copyMemberToMetaclass(fmmlxClass, member) {
        try {
            studio.copyMemberToMetaclass(fmmlxClass, member)
        } catch (e) {
            this.__error(e);
        }
    }

    static copyMemberToSuperclass(classId, memberId) {
        try {
            studio.copyMemberToSuperclass(classId, memberId)
        } catch (e) {
            this.__error(e);
        }
    }

    static createAssociation(source) {
        Materialize.toast("Select the target class", 4000);

        /**
         *
         * @param {go.DiagramEvent} event
         */
        let handler = function (event) {
            try {
                studio._diagram.removeDiagramListener("ObjectSingleClicked", handler);
                let target = event.subject.part.data;
                studio.createAssociation(source, target);
            } catch (err) {
                debugger;
                Controller.FormController.__error(err)
            }
        };
        diagram.addDiagramListener("ObjectSingleClicked", handler);
    }

    /**
     * Given an association, creates an instance of it
     * @param {go.Node} metaAssociation
     * @param {}
     */
    static createAssociationInstanceOrRefinement(metaAssociation, refinement) {
        /**
         *
         * @type {Model.FmmlxAssociation}
         */
        let instanceSrc, instanceTgt;
        Materialize.toast("Choose source", 4000);
        studio.setNodesVisibility(false);
        studio.showDescendantsOf(metaAssociation.source, metaAssociation.sourceIntrinsicness);
        let handlerSrc = function (event) {
            if (event.subject.part.constructor === go.Node) {
                studio._diagram.removeDiagramListener("ObjectSingleClicked", handlerSrc);
                instanceSrc = event.subject.part.data;
                Materialize.toast("Choose target", 4000);
                studio.setNodesVisibility(false);
                studio.showDescendantsOf(metaAssociation.target, metaAssociation.targetIntrinsicness);

                let handlerTgt = function (event) {
                    if (event.subject.part.constructor === go.Node) {
                        studio._diagram.removeDiagramListener("ObjectSingleClicked", handlerTgt);
                        studio.setNodesVisibility(true);
                        instanceTgt = event.subject.part.data;
                        studio.createAssociationInstanceOrRefinement(metaAssociation, instanceSrc, instanceTgt, refinement);
                    }
                };
                studio._diagram.addDiagramListener("ObjectSingleClicked", handlerTgt);
            }
        };
        studio._diagram.addDiagramListener("ObjectSingleClicked", handlerSrc);
    }

    static createInheritance(subclass) {
        Materialize.toast("Select the superclass", 4000);
        let handler = function (event) {
            try {
                diagram.removeDiagramListener("ObjectSingleClicked", handler);
                let superclass = event.subject.part.data;
                studio.changeClassSuperclass(superclass, subclass);
            } catch (err) {
                Controller.FormController.__error(err);
            }
        };

        diagram.addDiagramListener("ObjectSingleClicked", handler)
    }

    static deleteAssociation(assoc) {
        try {
            studio.deleteAssociation(assoc)
        } catch (err) {
            Controller.FormController.__error(err);
        }
    }

    /**
     * Deletes an FMMLx Class
     * @param {Model.FmmlxClass} fmmlxClass
     *
     */
    static deleteClass(fmmlxClass) {
        try {
            studio.deleteFmmlxClass(fmmlxClass)
        } catch (e) {
            this.__error(e);
        }
    }

    /**
     * Deletes the member definition everywhere.
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxProperty} member
     */
    static deleteMember(fmmlxClass, member) {
        try {
            studio.deleteMember(fmmlxClass, member, true, true);
        } catch (e) {
            this.__error(e);
        }
    }

    /**
     * Deletes the member definition upstream - that means from the metaclass upwards
     * @param {Model.FmmlxClass} fmmlxClass
     * @param {Model.FmmlxProperty} member
     */
    static deleteMemberUpstream(fmmlxClass, member) {
        try {
            studio.deleteMember(fmmlxClass, member, true, false);
        } catch (e) {
            this.__error(e);
        }
    }

    static deleteSuperclass(target) {
        let subclassId = target.data.from;
        let superclassId = target.data.to;
        studio.deleteSuperclass(subclassId, superclassId);
    }

    static displayAssociationForm(event, obj) {
        let modal = $("#fmmlxAssociationModal");
        let self = Controller.FormController;

        modal.find("form").replaceWith(window._associationForm.clone());
        //self.__setupExtraDataFields(modal);

        if (obj !== null && obj.data !== null) {
            obj.data.src = obj.data.source.name;
            obj.data.tgt = obj.data.target.name;
            self.__fillForm(modal, obj.data);
            delete obj.data.src;
            delete obj.data.tgt;
        }

        if (obj.data.isInstance) {
            modal.find("#association_sourceIntrinsicness").prop('disabled', 'disabled').parent().hide();
            modal.find("#association_targetIntrinsicness").prop('disabled', 'disabled').parent().hide();
        }

        let submitBtn = modal.find(".btn-flat");
        submitBtn.off("click", self.editFmmlxAssociation).one("click", self.editFmmlxAssociation);
        modal.find(':input')
            .remove("keydown")
            .keydown((e) => e.key.toLowerCase() === "enter" ? submitBtn.click() : true);
        modal.modal("open");
    }

    static displayClassForm(event = null, obj = null) {
        let modal = $("#fmmlxClassModal");
        let self = Controller.FormController;
        modal.find("form").replaceWith(window._classForm.clone());
        self.__setupExtraDataFields(modal);
        $("#class_level").on("change", function (event) {
            let metaClassSelect = $("#class_metaclass");
            if (!metaClassSelect.prop("disabled")) {
                let level = event.target.value;
                let options = [];
                for (let fmmlxClass of studio.getClassesByLevel(level)) {
                    if (fmmlxClass.id !== modal.find(`[name=id]`).val()) {
                        options.push(new Option(fmmlxClass.name, fmmlxClass.id))
                    }
                }
                self.__fillSelect(metaClassSelect, options);
            }
        });
        let tags = [];
        if (obj !== null && obj.data !== null) {
            self.__fillForm(modal, obj.data);
            tags = obj.data.tags;
        }

        $("#addClass").removeClass('pulse');
        let submitBtn = modal.find(".btn-flat");
        submitBtn.off("click", self.addEditFmmlxClass).one("click", self.addEditFmmlxClass);
        modal.find(':input')
            .remove("keydown")
            .on("keydown", (e) => e.key.toLowerCase() === "enter" ? submitBtn.trigger("click") : true);

        self.__setupChips(modal, tags);
        modal.modal("open");
    }

    /**
     *
     * @param {go.InputEvent} inputEvent
     * @param {go.GraphObject} target
     */
    static displayContextMenu(inputEvent, target) {
        const self = Controller.FormController;
        let menu;
        let contextMenus = $(".contextMenu");
        contextMenus.hide();
        switch (target.data.constructor) {
            case Model.FmmlxClass:
                menu = $("#classMenu");
                $("#inherit").off("click").one("click", () => self.createInheritance(target.data));
                $("#associate").off("click").one("click", () => self.createAssociation(target.data));
                $("#deleteClass").off("click").one("click", () => self.deleteClass(target.data));
                $("#abstractClass").off("click").one("click", () => self.abstractClass());
                $("#addMember").off("click").one("click", () => self.displayMemberForm(inputEvent, target.data));
                $("#filterChain").off("click").one("click", () => self.filterChains(inputEvent.targetDiagram.selection));
                break;

            case Model.FmmlxProperty:
                menu = $("#propertyMenu");
                $("#deleteMemberUpstream").off("click").one("click", () => self.deleteMemberUpstream(target.part.data, target.data));
                $("#deleteMember").off("click").one("click", () => self.deleteMember(target.part.data, target.data));
                $("#toMetaclass").off("click").one("click", () => self.copyMemberToMetaclass(target.part.data, target.data));
                $("#toSuperclass").off("click").one("click", () => self.copyMemberToSuperclass(target.part.data.id, target.data.id));
                break;

            case Model.FmmlxAssociation:
                menu = $("#associationMenu");
                let refine = $("#refineAssociation");
                let instantiate = $("#instantiateAssociation");
                if (target.part.data.isInstance) {
                    refine.hide();
                    instantiate.hide()
                } else {
                    refine.show();
                    instantiate.show();
                }
                $("#deleteAssociation").off("click").one("click", () => self.deleteAssociation(target.part.data));
                instantiate.off("click").one("click", () => self.createAssociationInstanceOrRefinement(target.part.data, false));
                refine.off("click").one("click", () => self.filterChains(target.diagram.selection));
                break;

            default: // Inheritance has no model because its just a plain link
                menu = $("#inheritanceMenu");
                $("#deleteInheritance").off("click").one("click", () => self.deleteSuperclass(target));
                break;
        }
        let width = menu.css("width");
        menu.css({
            top: inputEvent.event.pageY, left: inputEvent.event.pageX + 5, display: "block", width: 0,
        }).animate({width: width}, 300, "swing");

        $("body,canvas").one("click", () => contextMenus.hide());

        inputEvent.handled = true;

    }

    /**
     * Sets up and displays the filters
     */
    static displayFilterForm() {
        let modal = $("#filterModal");
        let data = "";
        modal.show();
        modal.find(".more").off().click(e => {
            let filterRow = $(e.target).parents(".filterRow");
            let newRow = filterRow.clone(true, true);
            let newId = `_${Helper.Helper.uuid4()}`;

            for (let input of newRow.find("input")) {
                //let newId = `_${Helper.Helper.uuid4()}`;
                if (input.id !== "") {
                    let label = newRow.find(`[for=${input.id}]`);
                    label.prop("for", label.prop("for").replace(/(_.*|$)/, newId));
                    input.name = input.name.replace(/(_.*|$)/, newId)
                    input.id = input.id.replace(/(_.*|$)/, newId)
                }
            }

            newRow.insertAfter(filterRow);
            modal.find("select").material_select();
        });
        modal.find(".less").off().click(e => {
            let filterRow = $(e.target).parents(".filterRow");
            filterRow.remove();
        });
        modal.modal("open");

    }

    static displayMemberForm(event, obj) {
        const self = Controller.FormController;
        const modal = $("#fmmlxAttributeModal");
        modal.find("form").replaceWith(window._propertyForm.clone());

        self.__setupExtraDataFields(modal);

        let opBodyManager = function () {
            let opBody = modal.find("[name=operationBody]");
            (modal.find("[name=isOperation]").prop("checked") && !modal.find("[name=isValue]")
                .prop("checked")) ? self.__showField(opBody) : self.__hideField(opBody);
        };

        $("[name=isOperation]").on("change", opBodyManager);
        modal.find("[name=isValue]").on("change", opBodyManager);
        let tags = [];

        if (obj.constructor === Model.FmmlxClass) { /*new property,it was right click on  the Class*/
            modal.find("[name=fmmlxClassId]").val(obj.id);
            /* id of the Fmmlx Class that will hold the property+*/
        } else {
            obj.data.behaviors.forEach((behavior) => {
                switch (behavior) {
                    case "O":
                        obj.data.isObtainable = "O";
                        break;
                    case "D":
                        obj.data.isDerivable = "D";
                        break;
                    case "S":
                        obj.data.isSimulation = "S";
                        break;
                }
            });
            obj.data.fmmlxClassId = obj.part.data.id;
            self.__fillForm(modal, obj.data);
            tags = obj.data.tags;

            $("#attribute_isValue").on("click", () => false);
            $("#attribute_isOperation").on("click", () => false);
            delete obj.data.isObtainable;
            delete obj.data.isDerivable;
            delete obj.data.isSimulation;
            delete obj.data.fmmlxClassId;
        }
        let submitBtn = modal.find(".btn-flat");
        submitBtn.off("click", self.addEditFmmlxClassMember).one("click", self.addEditFmmlxClassMember);
        modal.find(':input')
            .remove("keydown")
            .on("keydown", (e) => e.key.toLowerCase() === "enter" ? submitBtn.trigger("click") : true);
        self.__setupChips(modal, tags);
        modal.modal("open");
        event.handled = true;
    }

    static downloadImage() {
        let data = studio.toPNG();
        let fileType = "png";
        let anchor = $("#image");
        return this.__download(anchor, data, fileType);
    }

    static editFmmlxAssociation() {
        const self = Controller.FormController;
        const modal = $("#fmmlxAssociationModal");
        const form = modal.find("form");

        try {
            if (!form[0].checkValidity()) throw new Error("Invalid input. Check the highlighted fields and try again.");
            let formVals = self.__readForm(form);
            studio.editAssociation(formVals.id, formVals.name, formVals.sourceCardinality, formVals.sourceIntrinsicness, formVals.sourceRole, formVals.targetCardinality, formVals.targetIntrinsicness, formVals.targetRole);
        } catch (error) {
            let submitBtn = modal.find(".btn-flat");
            submitBtn.one("click", self.editFmmlxAssociation);
            modal.find(':input').keydown((e) => e.key.toLowerCase() === "enter" ? submitBtn.click() : true);
            self.__error(error);
            return false;
        }
        modal.modal("close");
    }

    static exportJson() {
        let data = `data:text/plain;UTF-8,${encodeURIComponent(studio.toJSON())}`;
        let fileType = "txt";
        let anchor = $("#export");
        return this.__download(anchor, data, fileType);
    }

    /**
     * Shows only the inheritance trees of the selected classes
     * @param {Set<go.Part>} selection
     */
    static filterChains(selection) {
        const self = Controller.FormController;
        self.showFilterToast();
        let classes = [];
        selection.each((part) => {
            classes.push(part.data);
        });
        studio.filterModelByTrees(classes);
    }

    static showFilterToast() {
        let toastContent = "Filters Updated!", timeOut = 6000;

        if ($('.filterMessage').length === 0) {
            toastContent = $(`<span class="filterMessage">There are active Filters</span>`).add($(`<button class="btn-flat toast-action" onclick="Controller.FormController.resetFilters()">Reset Filters</button>`));
            timeOut = Infinity;
        }
        Materialize.toast(toastContent, timeOut);
    }

    /**
     * Resets all filters, showing all classes
     */
    static resetFilters() {
        studio.setNodesVisibility(true); // Show Everything
        $('.filterMessage').parent()[0].M_Toast.remove(); //delete filter toast
        Materialize.toast("All filters have been reset", 6000);
    }

    static importJson() {
        let reader = new FileReader();
        reader.onload = (e) => {
            let json = reader.result;
            studio.fromJSON(json);
        };
        reader.readAsText($("#importFile")[0].files[0]);
    }

    static init() {
        $("select").material_select();
        window._classForm = $("#fmmlxClassModal").find("form").clone();
        window._propertyForm = $("#fmmlxAttributeModal").find("form").clone();
        window._associationForm = $("#fmmlxAssociationModal").find("form").clone();
        $(".modal").modal();
    }
};
