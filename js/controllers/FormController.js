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

            if (field.prop("type") === "checkbox" && Boolean(field.val()) === data[fieldName])
                field.click();
            else if (field.prop("type") !== "checkbox") {
                field.val(data[fieldName]);
                field.click();
            }
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
            if (name !== "")
                fieldData[`${name}`] = ( (field.type === "checkbox" && field.checked) || field.type !== "checkbox") ? field.value : "";
            else
                fieldData[`${name}`] = field.value;
        }
        return fieldData;
    },

    setupExtraDataFields: function (modal) {
        let field = modal.find(".needsExtraInfo");
        field.change(function (event) {
            let target = $(event.target);
            let relNames = target.data("related").split(",");
            for (let name of relNames) {
                let related = target.closest("form").find(`[name=${name.trim()}]`);
                if (target.prop("checked")) {
                    related.prop("disabled", false);
                    related.closest(".form-group").show();
                }
                else {
                    related.prop("disabled", true);
                    related.closest(".form-group").hide();
                }

            }
        });
    },

    displayClassForm: function (event, obj) {
        let self = Controller.FormController;
        let modal = $("#fmmlxClassModal");
        if(typeof self._classFormData !== "undefined") modal.find("form").replaceWith(self._classFormData);
        let point = go.Point.stringify(event.documentPoint);
        let entityId = obj.data !== null ? obj.data.id : "";
        let externalField = modal.find("[name=isExternal]");
        let metaClassSelect = modal.find("[name=metaclass]");
        if(typeof self._classFormData === "undefined") modal.find("form").clone();

        modal.modal();
        self.setupExtraDataFields(modal);
        externalField.change(function (event) {
            let formGroup = metaClassSelect.closest(".form-group");
            if (event.target.checked) {
                formGroup.hide();
                metaClassSelect[0].disabled = true;
            }
            else {
                formGroup.show();
                metaClassSelect[0].disabled = false
            }
        });
        self.__reset(modal);

        //Adds new metaclasses based on level

        modal.find("[name=level]").change(function (event) {
                if (externalField.prop("checked")) {
                    let level = event.target.value;
                    let classes = studio.getClassesbyLevel(level);
                    for (let i = 0; i < metaClassSelect[0].options; i++) {
                        metaClassSelect[0].remove(i);
                    }
                    for (let fmmlxClass in classes) {
                        metaClassSelect[0].add(new HTMLOptionElement(fmmlxClass.name, fmmlxClass.id));
                    }
                }
            }
        );


        modal.find("[name=coords]").val(point);
        if (entityId !== "") {
            self.__fillForm(modal, obj.data);
        }

    },

    raiseProperty: function (event, obj) {
        alert(JSON.stringify(obj.part.data));
    },


    displayPropertyForm: function (event, obj) {
        alert(JSON.stringify(obj.part.data));
    },

    displayAssociationForm: function (event, obj) {
        alert(JSON.stringify(obj.part.data));
    },

    displayInheritanceForm: function (event, obj) {
        alert(JSON.stringify(obj.part.data));
    },

    deleteProperty: function (event, obj) {
        alert(JSON.stringify(obj.part.data));
    },

    abstractClass: function (event, obj) {
        alert(JSON.stringify(obj.part.data));
    },

    deleteClass: function (event, obj) {
        alert(JSON.stringify(obj.part.data));
    },


    addEditFmmlxClass: function () {

        const self = Controller.FormController;
        const form = $("#classForm");
        const modal = form.closest("modal");


        if (!form[0].checkValidity()) {
            form.find(":invalid").closest(".form-group").addClass("has-error");
            self.__error(form, new Error("Invalid input. Check the highlighted fields and try again."));
            return false;
        }

        try {
            let formVals = self.__readForm(form);
            if (formVals.id === "")
                studio.addFmmlxClass(formVals.coords, formVals.name, formVals.level, formVals.isAbstract, formVals.metaclass, formVals.externalLanguage, formVals.externalMetaclass);
            else
                studio.editFmmlxClass(formVals.id, formVals.name, formVals.level, formVals.isAbstract, formVals.metaclass, formVals.externalLanguage, formVals.externalMetaclass)

        }
        catch (error) {
            self.__error(form, error);
        }
        modal.modal("hide");
        return false;
    }

}
;
