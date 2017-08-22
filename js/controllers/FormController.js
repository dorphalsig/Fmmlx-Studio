"use strict";

if (typeof Controller === "undefined") window.Controller = {};

Controller.FormController = {

    /**
     *
     * @param {JQuery} modal
     * @param {Error} error
     * @private
     */
    __error: function (modal, error=undefined) {
        let alert = modal.find(".alert");
        if (typeof error !== "undefined") {
            alert.find(".message").text(error.message);
            alert.show();
            console.log("\n***********************************");
            console.log(error);
            return;
        }
        alert.hide();
    },

    __reset: function (modal) {
        Controller.FormController.__error(modal); // hiddes error messages
        modal.find("form").trigger("reset");
        modal.find(".remove").click();
    },

    /**
     * Generic form filler
     * @param {JQuery} modal window
     * @param data
     * @private
     */
    __fillForm: function (modal, data) {
        for (let fieldName in data) {
            if (!data.hasOwnProperty(fieldName))
                continue;

            let field = modal.find(`[name=${fieldName}]`);

            if (field.prop("type") === "checkbox")
                field.prop("checked", field.val() === data[fieldName]);
            else
                field.val(data[fieldName]);
        }
    },

    /**
     * Parses a form into an object. The field names are the properties of the object
     * @param {JQuery} form
     * @returns {{}}
     * @private
     */
    __readForm: function (form) {
        let fields = form.find(':input');
        let fieldData = {};
        for (let field of fields) {
            //field = $(field)
            let name = field.name;
            if (name !== "")
                fieldData[`${name}`] = ( (field.type === "checkbox" && field.checked) || field.type !== "checkbox") ? field.value : "";
            else
                fieldData[`${name}`] = field.value;
        }
        return fieldData;
    },

    setupExtraDataFields: function (modal) {
        let field = modal.find('.needsExtraInfo');
        field.change(function (event) {
            let target = $(event.target);
            let relNames = target.data("related").split(",");
            for (let name of relNames) {
                let related = target.closest("form").find(`[name=${name.trim()}]`);
                if (target.prop('checked')) {
                    related.prop("disabled", false);
                    related.closest(".form-group").show();
                }
                else {
                    related.prop("disabled", true);
                    related.closest(".form-group").hide();
                }

            }
        })
    },

    displayClassForm: function (event, obj) {
        let self = Controller.FormController;
        let modal = $("#fmmlxClassModal");
        let point = go.Point.stringify(event.documentPoint);
        let entityId = obj.data !== null ? obj.data.id : "";

        self.__reset(modal);
        self.setupExtraDataFields(modal);
        modal.find("[name=isExternal]").click(function (event) {
            event.target.checked ? modal.find("[name=metaclass]").closest(".form-group").hide() : modal.find("[name=metaclass]").closest(".form-group").show()
        });

        modal.find("[name=coords]").val(point);
        if (entityId !== "") {
            self.__fillForm(modal, obj.data);
        }
        modal.modal();
    },

    raiseProperty: function (event, obj) {
        alert(JSON.stringify(obj.part.data))
    },

    deleteProperty: function (event, obj) {
        alert(JSON.stringify(obj.part.data))
    },

    abstractClass: function (event, obj) {
        alert(JSON.stringify(obj.part.data))
    },

    deleteClass: function (event, obj) {
        alert(JSON.stringify(obj.part.data))
    },

    displayPropertyForm: function (event, obj) {
        alert(JSON.stringify(obj.part.data))
    },

    displayAssociationForm: function (event, obj) {
        alert(JSON.stringify(obj.part.data));
    },

    displayInheritanceForm: function (event, obj) {
        alert(JSON.stringify(obj.part.data))
    },

    addEditFmmlxClass: function () {

        const self = Controller.FormController;
        const form = $("#classForm");
        const modal = form.closest('modal');

        if (!form[0].checkValidity()) {
            form.find(':invalid').closest('.form-group').addClass('has-error');
            self.__error(form, new Error("Invalid input. Check the highlighted fields and try again."));
            return false;
        }

        try {
            if (form.find("[name=id]").val() === "") {
                let formVals = self.__readForm(form);
                window.studio.addFmmlxClass(formVals.coords, formVals.name, formVals.level, formVals.isAbstract, formVals.externalLanguage, formVals.externalMetaclass)
            }
        }
        catch (error) {
            self.__error(modal, error);
        }
        modal.close();
        return false;
    },

};
