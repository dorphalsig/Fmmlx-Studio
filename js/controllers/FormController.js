"use strict";

if (typeof Controller === "undefined") {
    var Controller;
    Controller = {};
}

Controller.FormController = {

    __error: function (modal, message) {
        let alert = modal.find(".alert");
        if (typeof message !== "undefined") {
            alert.find(".message").text(message);
            alert.show();
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
     * @param {jquery} modal window
     * @param data
     * @private
     */
    __fillForm: function (modal, data) {
        for (let fieldName in data) {
            let field = modal.find(`[name=${fieldName}]`);

            if (field.type === "checkbox")
                field.checked = field.value === data[fieldName];
            else
                field.value = data[fieldName];
        }
    },

    /**
     * Parses a form into an object. The field names are the properties of the object
     * @param modal
     * @returns {{}}
     * @private
     */
    __readForm: function (form) {
        let fields = form.find(':input');
        let fieldData = {};
        for (let field of fields) {
            //field = $(field)
            let name = field.name;
            if (name != "")
                fieldData[`${name}`] = ( (field.type ==="checkbox"&& field.checked) || field.type !== "checkbox") ? field.value : "";
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

    displayClassForm: function (point = "", entityId = "") {
        let self = Controller.FormController;
        let modal = $("#fmmlxClassModal");
        self.__reset(modal);
        self.setupExtraDataFields(modal);
        modal.find("[name=isExternal]").click(function (event) {
            event.target.checked ? modal.find("[name=metaclass]").closest(".form-group").hide() : modal.find("[name=metaclass]").closest(".form-group").show()
        });
        //modal.find('.btn-primary').one(Controller.FormController.addEditFmmlxClass);
        if (point !== "")
            modal.find("[name=coords]").val(point);
        if (entityId !== "") {
            let data = studio.getNodeData(entityId);
            this.__fillForm(modal, data);
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


    addEditFmmlxClass: function () {

        const self = Controller.FormController;
        const form = $("#classForm");

        if (!form[0].checkValidity()) {
            form.find(':invalid').closest('.form-group').addClass('has-error');
            let modal = form.closest('modal');
            self.__error(form, "Invalid input. Check the highlighted fields and try again.");
            return false;
        }
        try {
            if (form.find("[name=id]").val() === "") {
                let formVals = self.__readForm(form);
                window.studio.addFmmlxClass(formVals.coords, formVals.name, formVals.level, formVals.isAbstract, formVals.externalLanguage, formVals.externalMetaclass)
            }
        }
        catch (error) {
            let modal = form.closest(".modal");
            self.__error(modal,error.message);
            console.log(error)
        }

        return false;
    },

    dragStartHandler: function (event) {
        event.originalEvent.dataTransfer.setData("shape", event.target.id)
    },

    /**
     * handles dropping of menu items into the main div
     * @param event
     */
    dropHandler: function (event) {
        let shape = event.originalEvent.dataTransfer.getData("shape");
        // Dragging onto a Diagram
        let can = event.originalEvent.target;
        let pixelratio = window.PIXELRATIO;

        // if the target is not the canvas, we may have trouble, so just quit:
        if (!(can instanceof HTMLCanvasElement)) return;

        let bbox = can.getBoundingClientRect();
        let bbw = Math.max(0.001, bbox.width);
        let bbh = Math.max(0.001, bbox.height);
        if (bbh === 0) bbh = 0.001;
        let mx = event.clientX - bbox.left * ((can.width / pixelratio) / bbw);
        let my = event.clientY - bbox.top * ((can.height / pixelratio) / bbh);

        switch (shape) {
            case "fmmlxClass":
                Controller.FormController.addEditFmmlxClass(mx, my);
                break;
            case "relationship":
                formHandler.showRelForm(mx, my);
                break;

            case "inheritance":
                formHandler.showInheritanceForm(mx, my);
                break;
        }
    }
}
