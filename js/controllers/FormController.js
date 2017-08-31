"use strict";

if (typeof Controller === "undefined") window.Controller = {};

Controller.FormController = {

    /**
     *
     * @param {JQuery} form
     * @param {Error} error
     * @private
     */
    __error: function (form, error = undefined) {
        let alert = form.find(".alert");
        if (typeof error !== "undefined") {
            alert.find(".message").text(error.message);
            alert.show();
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

            if (field.prop("type") === "checkbox" && Boolean(field.val()) === data[fieldName]) field.click(); else if (field.prop(
                    "type") !== "checkbox") {
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
        for (let opt of select) {
            if (typeof $(opt).data("keep") === "undefined") select.remove(opt);
        }
        for (let option of options) {
            select.add(option);
        }
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
            if (name !== "") fieldData[`${name}`] = ( (field.type === "checkbox" && field.checked) || field.type !== "checkbox") ? field.value : ""; else fieldData[`${name}`] = field.value;
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
        field.closest(".form-group").show();
    },

    /**
     * Hides and disables field and its form-group
     * @param {JQuery} field
     * @private
     */
    __hideField: function (field) {
        field.prop("disabled", true);
        field.closest(".form-group").hide();
    },

    __setupExtraDataFields: function (modal) {
        modal.find(".needsExtraInfo").change(function (event) {
            let self = Controller.FormController;
            let target = $(event.target);
            let show = typeof target.data("show") === "undefined" ? [] : target.data("show").split(",");
            let hide = typeof target.data("hide") === "undefined" ? [] : target.data("hide").split(",");
            for (let fieldName of show) {
                let field = modal.find(`[name=${fieldName}]`);
                target.prop("checked") ? self.__showField(field) : self.__hideField(field);
            }
            for (let fieldName of hide) {
                let field = modal.find(`[name=${fieldName}]`);
                target.prop("checked") ? self.__hideField(field) : self.__showField(field);
            }
        });
    },

    displayClassForm: function (event, obj) {
        let self = Controller.FormController;
        let modal = $("#fmmlxClassModal");
        let point = go.Point.stringify(event.documentPoint);
        let entityId = obj.data !== null ? obj.data.id : "";

        typeof window._classFormData === "undefined" ? window._classFormData = modal.clone() : modal.replaceWith(window._classFormData);

        self.__setupExtraDataFields(modal);

        //Populates select with metaclasses according to level
        let metaClassSelect = modal.find("[name=metaclass]");
        modal.find("[name=level]").change(function (event) {
            if (!metaClassSelect.prop("disabled")) {
                let level = event.target.value;
                let options = studio.getClassesbyLevel(level).map(fmmlxClass => new Option(fmmlxClass.name,
                    fmmlxClass.id));
                self.__fillSelect(metaClassSelect, options);
            }
        });

        (entityId !== "") ? self.__fillForm(modal, obj.data) : modal.find("[name=coords]").val(point);

        modal.find(".btn-primary").one("click", self.addEditFmmlxClass);
        modal.modal();

    },

    raiseProperty: function (event, obj) {
        alert(JSON.stringify(obj.part.data));
    },

    /**
     *
     * @param {go.InputEvent|go.GraphObject} inputEvent
     * @param {go.GraphObject|go.Diagram} target
     */
    showHideContextMenu: function (inputEvent, target/*target, diagram, tool*/) {
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


        //let canvasOffset = menu.prev().offset();
        //let clickOffset =  tool.mouseDownPoint;
        //let offset = {top: clickOffset.y+canvasOffset.top, left: clickOffset.x+canvasOffset.left+20}
        menu.show().offset({
            top: inputEvent.event.pageY,
            left: inputEvent.event.pageX + 5,
        });
        //menu.on("contextMenu",()=>{debugger; return false});

        $(document).one("click", function (event) {
            let container = menu.find(".dropdown-toggle");
            if (!container.is(event.target) && container.has(event.target).length === 0) {
                menu.hide();
                $(this).off(event);//.off("contextMenu");

            }
        });

        inputEvent.event.stopImmediatePropagation();

    },

    displayPropertyForm: function (event, obj) {
        const self = Controller.FormController;
        const modal = $("#fmmlxAttributeModal");
        //const form = modal.find("form");
        typeof window._attributeFormData === "undefined" ? window._attributeFormData = modal.clone() : modal.replaceWith(
            window._attributeFormData);
        self.__setupExtraDataFields(modal);

        let opBodyManager = function () {
            let opBody = modal.find("[name=operationBody]");
            (modal.find("[name=isOperation]").prop("checked") && !modal.find("[name=isValue]").prop("checked")) ? self.__showField(
                opBody) : self.__hideField(opBody);
        };

        modal.find("[name=isOperation]").change(opBodyManager);
        modal.find("[name=isValue]").change(opBodyManager);

        if (obj.data.constructor === Model.FmmlxClass) { //new property,it was righht click on  the Class
            modal.find("[name=fmmlxClassId]").val(obj.data.id); // id of the Fmmlx Class that will hold the property+
        } else {
            alert(" Todo xD");
        }
        modal.find(".btn-primary").one("click", self.addEditFmmlxProperty);
        modal.modal();
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


    addEditFmmlxClass: function () {
        const self = Controller.FormController;
        const modal = $("#fmmlxClassModal");
        const form = modal.find("form");

        if (!form[0].checkValidity()) {
            form.find(":invalid").closest(".form-group").addClass("has-error");
            self.__error(form, new Error("Invalid input. Check the highlighted fields and try again."));
            return false;
        }

        try {
            let formVals = self.__readForm(form);
            if (formVals.id === "") studio.addFmmlxClass(formVals.coords,
                formVals.name,
                formVals.level,
                formVals.isAbstract,
                formVals.metaclass,
                formVals.externalLanguage,
                formVals.externalMetaclass); else studio.editFmmlxClass(formVals.id,
                formVals.name,
                formVals.level,
                formVals.isAbstract,
                formVals.metaclass,
                formVals.externalLanguage,
                formVals.externalMetaclass);

        }
        catch (error) {
            self.__error(form, error);
        }
        modal.modal("hide");
        return false;
    },

    addEditFmmlxProperty() {
        const self = Controller.FormController;
        const modal = $("#fmmlxAttributeModal");
        const form = modal.find("form");

        if (!form[0].checkValidity()) {
            form.find(":invalid").closest(".form-group").addClass("has-error");
            self.__error(form, new Error("Invalid input. Check the highlighted fields and try again."));
            return false;
        }
        let formVals = self.__readForm(form);
        if (formVals.id === "") studio.createMember(formVals.fmmlxClassId,
            formVals.name,
            formVals.type,
            formVals.intrinsicness,
            formVals.isOperation,
            formVals.isObtainable,
            formVals.isDerivable,
            formVals.isSimulation,
            formVals.isValue,
            formVals.value,
            formVals.operationBody); else alert("ToDo xD");
    },

};
