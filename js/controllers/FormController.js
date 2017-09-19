"use strict";

if (typeof Controller === "undefined") {
    window.Controller = {};
}

Controller.FormController = class {

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
     * @returns {*}
     * @private
     */
    static __readForm(form) {
        let fields = form.find(":input:not([disabled])");
        let fieldData = {};
        for (let field of fields) {
            /*rfield = $(field)*/
            let name = field.name;
            if (name !== "") {
                fieldData[`${name}`] = ( (field.type === "checkbox" && field.checked) || field.type !== "checkbox") ? field.value : "";
            } else {
                fieldData[`${name}`] = field.value;
            }
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

        if (!form[0].checkValidity()) {
            self.__error(new Error("Invalid input. Check the highlighted fields and try again."));
            return false;
        }

        try {
            let formVals = self.__readForm(form);

            if (formVals.id === "") {
                studio.addFmmlxClass(formVals.name, formVals.level, formVals.isAbstract, formVals.metaclass.toString(), formVals.externalLanguage, formVals.externalMetaclass);
                Materialize.toast("Click on the canvas to insert the class", 4000);
            } else {
                studio.editFmmlxClass(formVals.id, formVals.name, formVals.level, formVals.isAbstract, formVals.metaclass, formVals.externalLanguage, formVals.externalMetaclass);
            }

        } catch (error) {
            let submitBtn = modal.find(".btn-flat");
            submitBtn.one("click", self.addEditFmmlxClass);
            modal.find(':input').keydown((e) => e.key.toLowerCase() === "enter" ? submitBtn.click() : true);
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

    /**
     * Deletes an FMMLx Class
     * @param {go.Node} node
     *
     */
    static deleteClass(node) {
        try {
            studio.deleteFmmlxClass(node.data.id)
        } catch (e) {
            self.__error(e);
        }
    }

    /**
     * Deletes the member definition everywhere.
     * @param classId
     * @param memberId
     */
    static deleteMember(classId, memberId) {
        try {
            studio.deleteMember(classId, memberId, true, true);
        } catch (e) {
            this.__error(e);
        }
    }

    /**
     * Deletes the member definition upstream - that means from the metaclass upwards
     * @param classId
     * @param memberId
     */
    static deleteMemberUpstream(classId, memberId) {
        try {
            studio.deleteMember(classId, memberId, true, false);
        } catch (e) {
            this.__error(e);
        }
    }

    static displayAssociationForm(event, obj) {
        alert("This is not a bug, its a feature!");
    }

    static displayClassForm(event = null, obj = null) {
        const modal = $("#fmmlxClassModal");
        const self = Controller.FormController;

        modal.find("form").replaceWith(window._classForm.clone());
        self.__setupExtraDataFields(modal);


        $("#class_level").change(function (event) {
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

        if (obj !== null && obj.data !== null) {
            self.__fillForm(modal, obj.data);
        }

        $("#addClass").removeClass('pulse');
        let submitBtn = modal.find(".btn-flat");
        submitBtn.off("click", self.addEditFmmlxClass).one("click", self.addEditFmmlxClass);
        modal.find(':input')
            .remove("keydown")
            .keydown((e) => e.key.toLowerCase() === "enter" ? submitBtn.click() : true);
        modal.modal("open");
    }

    /**
     *
     * @param {go.InputEvent} inputEvent
     * @param {go.GraphObject} target
     */
    static displayContextMenu(inputEvent, target) {
        const self = Controller.FormController;
        let menu = "";
        switch (target.data.constructor) {
            case Model.FmmlxClass:
                menu = $("#classMenu");
                $("#inherit").off("click").one("click", () => self.displayInheritanceForm(inputEvent, target));
                $("#associate").off("click").one("click", () => self.displayAssociationForm(inputEvent, target));
                $("#deleteClass").off("click").one("click", () => self.deleteClass(target));
                $("#abstractClass").off("click").one("click", () => self.abstractClass(target));
                $("#addMember").off("click").one("click", () => self.displayMemberForm(inputEvent, target));
                break;

            case Model.FmmlxProperty:
                menu = $("#propertyMenu");
                $("#deleteMemberUpstream").off("click").one("click", () => self.deleteMemberUpstream(target.part.data.id, target.data.id));
                $("#deleteMember").off("click").one("click", () => self.deleteMember(target.part.data.id, target.data.id));
                $("#toMetaclass").off("click").one("click", () => self.copyMemberToMetaclass(target.part.data.id, target.data.id));
                $("#toSuperclass").off("click").one("click", () => self.copyMemberToSuperclass(target.part.data.id, target.data.id));
                break;

            default:
                return;
                break;
        }
        let width = menu.css("width");
        menu.css({
            top: inputEvent.event.pageY, left: inputEvent.event.pageX + 5, display: "block", width: 0,
        }).animate({width: width}, 300, "swing");

        $("body,canvas").one("click", function (event) {
            menu.hide();
        });

        inputEvent.handled = true;

    }

    static displayInheritanceForm(event, obj) {
        alert("You want me to do WHAT?");
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

        $("[name=isOperation]").change(opBodyManager);
        modal.find("[name=isValue]").change(opBodyManager);

        if (obj.data.constructor === Model.FmmlxClass) { /*new property,it was right click on  the Class*/
            modal.find("[name=fmmlxClassId]").val(obj.data.id);
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
            $("#attribute_isValue").click(() => false);
            $("#attribute_isOperation").click(() => false);
            delete obj.data.isObtainable;
            delete obj.data.isDerivable;
            delete obj.data.isSimulation;
            delete obj.data.fmmlxClassId;
        }
        let submitBtn = modal.find(".btn-flat");
        submitBtn.off("click", self.addEditFmmlxClassMember).one("click", self.addEditFmmlxClassMember);
        modal.find(':input')
            .remove("keydown")
            .keydown((e) => e.key.toLowerCase() === "enter" ? submitBtn.click() : true);
        modal.modal("open");
        event.handled = true;
    }

    static downloadImage() {
        let data = studio.toPNG();
        let fileName = `Model ${new Date(Date.now())}`;
        let anchor = $("#image");
        anchor.prop("href", data);
        anchor.prop("download", fileName);
        return true;
    }

    static exportJson() {

    }

    static init() {
        $("select").material_select();
        window._classForm = $("#fmmlxClassModal").find("form").clone();
        window._propertyForm = $("#fmmlxAttributeModal").find("form").clone();
        $(".modal").modal();
    }

    static copyMemberToMetaclass(classId, memberId) {
        try {
            studio.copyMemberToMetaclass(classId, memberId)
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

};
