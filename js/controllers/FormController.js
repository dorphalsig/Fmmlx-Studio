"use strict";

if (typeof Controller === "undefined") window.Controller = {};

Controller.FormController = {

    init() {
        $("select").material_select();
        window._classForm = $("#fmmlxClassModal").find("form").clone();
        window._propertyForm = $("#fmmlxAttributeModal").find("form").clone();
        $(".modal").modal();
    },


    /**
     *
     * @param {JQuery} form
     * @param {Error} error
     * @private
     */
    __initSelect() {


    },


    __error: function (form, error = undefined) {

        if (typeof error !== "undefined") {
            Materialize.toast(`<h6 class="lime-text text-accent-1"><strong>ERROR!</strong></h6>&nbsp; ${error.message}`, 6000);
            console.log("\n***********************************");
            console.log(error);
            return;
        }
        alert.hide();
    },

    /**
     * Generic form filler
     * @param {JQuery} modal window
     * @param data
     * @private
     */
    __fillForm: function (modal, data) {

        for (let fieldName in data) {
            if (!data.hasOwnProperty(fieldName)) continue;

            let field = modal.find(`[name=${fieldName}]`);

            if (field.prop("type") === "checkbox" && field.val() == data[fieldName]) {
                field.click();
                field.change();
            }
            else if (field.prop("type") !== "checkbox") {
                field.val(data[fieldName]);
                field.click();
                field.change();

            }
        }
    },

    /**
     * generic filler for a Select field. Removes all the options not marked with data-keep
     * @param {HTMLOptionElement[]} options
     * @param {JQuery} select
     * @private
     */
    __fillSelect(select, options) {
        /**
         *
         * @type {HTMLSelectElement}
         */
        select = select[0];
        for (let opt of select.options) {
            if (typeof $(opt).data("keep") === "undefined") select.remove(opt);
        }
        for (let option of options) {
            select.add(option);
        }
        $(select).material_select();
    },

    /**
     * Parses a form into an object. The field names are the properties of the object
     * @param {JQuery} form
     * @returns {{}}
     * @private
     */
    __readForm: function (form) {
        let fields = form.find(":input:not([disabled])");
        let fieldData = {};
        for (let field of fields) {
            //field = $(field)
            let name = field.name;
            if (name !== "") fieldData[`${name}`] = ( (field.type === "checkbox" && field.checked) || field.type !== "checkbox") ? field.value : "";
            else fieldData[`${name}`] = field.value;
        }
        return fieldData;
    },

    /**
     * Shows and enables field and its form-group
     * @param {JQuery} field
     * @private
     */
    __showField: function (field) {
        field.prop("disabled", false);
        field.closest(".input-field").removeClass("hide");
    },

    /**
     * Hides and disables field and its form-group
     * @param {JQuery} field
     * @private
     */
    __hideField: function (field) {
        field.prop("disabled", true);
        field.closest(".input-field").addClass("hide");
    },

    /**
     * Checks the fields that have class needsExtraInfo and sets them up according to data-show and data-hide
     * @param {JQuery} modal
     * @private
     */
    __setupExtraDataFields: function (modal) {
        modal.find(".needsExtraInfo").change(function (event) {
            let self = Controller.FormController;
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
    },


    displayClassForm: function (event = null, obj = null) {
        let self = Controller.FormController;
        let modal = $("#fmmlxClassModal");
        modal.find("form").replaceWith(window._classForm.clone());
        self.__setupExtraDataFields(modal);
        modal.find(".btn-flat").one("click", Controller.FormController.addEditFmmlxClass);

        $("#class_level").change(function (event) {
            let metaClassSelect = $("#class_metaclass");
            if (!metaClassSelect.prop("disabled")) {
                let self = Controller.FormController;
                let level = event.target.value;
                let options = studio.getClassesbyLevel(level)
                                    .map(fmmlxClass => new Option(fmmlxClass.name, fmmlxClass.id));
                self.__fillSelect(metaClassSelect, options);
            }
        });

        if (obj !== null && obj.data !== null) self.__fillForm(modal, obj.data);

        modal.modal("open");
    },

    raiseProperty: function (event, obj) {
        alert(JSON.stringify(obj.part.data));
    },

    /**
     *
     * @param {go.InputEvent} inputEvent
     * @param {go.GraphObject} target
     */
    showHideContextMenu: function (inputEvent, target) {
        let menu = "";
        let self = Controller.FormController;
        switch (target.data.constructor) {
            case Model.FmmlxClass:
                menu = $("#classMenu");
                $("#inherit").one("click", () => self.displayInheritanceForm(inputEvent, target));
                $("#associate").one("click", () => self.displayAssociationForm(inputEvent, target));
                $("#deleteClass").one("click", () => self.deleteProperty(target));
                $("#abstractClass").one("click", () => self.abstractClass(target));
                $("#addMember").one("click", () => self.displayPropertyForm(inputEvent, target));
                break;

            case Model.FmmlxProperty:
                menu = $("#propertyMenu");
                break;
        }
        let width = menu.css("width");
        menu.css({
            top: inputEvent.event.pageY, left: inputEvent.event.pageX + 5, display: "block", width: 0,
        }).animate({width: width}, 300, "swing");

        $("body,canvas").one("click", function (event) {
            menu.hide();
        });

        inputEvent.event.stopImmediatePropagation();

    },

    displayPropertyForm: function (event, obj) {
        const self = Controller.FormController;
        let modal = $("#fmmlxAttributeModal");
        modal.find("form").replaceWith(window._propertyForm.clone());
        self.__setupExtraDataFields(modal);
        modal.find(".btn-flat").one("click", Controller.FormController.addEditFmmlxProperty);

        let opBodyManager = function () {
            let opBody = modal.find("[name=operationBody]");
            (modal.find("[name=isOperation]").prop("checked") && !modal.find("[name=isValue]")
                                                                       .prop("checked")) ? self.__showField(opBody) : self.__hideField(opBody);
        };

        $("[name=isOperation]").change(opBodyManager);
        modal.find("[name=isValue]").change(opBodyManager);

        if (obj.data.constructor === Model.FmmlxClass) { //new property,it was righht click on  the Class
            modal.find("[name=fmmlxClassId]").val(obj.data.id); // id of the Fmmlx Class that will hold the property+
        }
        else {
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
            //delete obj.data.behaviors;
            self.__fillForm(modal, obj.data);
            delete obj.data.isObtainable;
            delete obj.data.isDerivable;
            delete obj.data.isSimulation;
        }
        modal.find(".btn-primary").one("click", self.addEditFmmlxProperty);
        modal.modal("open");
        event.handled = true;
    },

    displayAssociationForm: function (event, obj) {
        alert("This is not a bug, its a feature!");
    },

    displayInheritanceForm: function (event, obj) {
        alert("You want me to do WHAT?");
    },

    deleteProperty: function (obj) {
        //alert("Just did it");
        studio.deleteFmmlxClass(obj.data.id);
    },

    abstractClass: function (obj) {
        alert("This is not a feature, its a bug!");
    },

    deleteClass: function (event, obj) {
        alert(JSON.stringify(obj.part.data));
    },


    addEditFmmlxClass: function (event) {
        const self = Controller.FormController;
        const modal = $("#fmmlxClassModal");
        const form = modal.find("form");

        if (!form[0].checkValidity()) {
            self.__error(form, new Error("Invalid input. Check the highlighted fields and try again."));
            return false;
        }

        try {
            let formVals = self.__readForm(form);

            if (formVals.id === "") {
                studio.addFmmlxClass(formVals.name, formVals.level, formVals.isAbstract, formVals.metaclass, formVals.externalLanguage, formVals.externalMetaclass);
                Materialize.toast("Click on the canvas to insert the class", 4000);
            }
            else studio.editFmmlxClass(formVals.id, formVals.name, formVals.level, formVals.isAbstract, formVals.metaclass, formVals.externalLanguage, formVals.externalMetaclass);

        }
        catch (error) {
            modal.find(".btn-flat").one("click", Controller.FormController.addEditFmmlxClass);
            self.__error(form, error);
            return;
        }
        modal.modal("close");
    },

    addEditFmmlxProperty: function (e) {
        const self = Controller.FormController;
        const modal = $("#fmmlxAttributeModal");
        const form = modal.find("form");
        if (!form[0].checkValidity()) {
            form.find(":invalid").closest(".form-group").addClass("has-error");
            self.__error(form, new Error("Invalid input. Check the highlighted fields and try again."));
            return false;
        }
        try {
            let formVals = self.__readForm(form);
            formVals.behaviors = [];
            if (formVals.isObtainable.length > 0) formVals.behaviors.push(formVals.isObtainable);
            if (formVals.isDerivable.length > 0) formVals.behaviors.push(formVals.isDerivable);
            if (formVals.isSimulation.length > 0) formVals.behaviors.push(formVals.isSimulation);
            if (formVals.id === "") studio.createMember(formVals.fmmlxClassId, formVals.name, formVals.type, formVals.intrinsicness, formVals.isOperation, formVals.behaviors, formVals.isValue, formVals.value, formVals.operationBody);
            else alert("ToDo xD");
        }
        catch (error) {
            modal.find(".btn-flat").one("click", Controller.FormController.addEditFmmlxProperty);
            self.__error(form, error);
            return;
        }

        modal.modal("close");
    },

};
