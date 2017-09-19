"use strict";
if (window.jQuery) {

    let scripts = ["https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/js/bootstrap.min.js", "https://cdnjs.cloudflare.com/ajax/libs/bootstrap-material-design/0.5.10/js/material.min.js", "https://cdnjs.cloudflare.com/ajax/libs/bootstrap-material-design/0.5.10/js/ripples.min.js", "https://cdnjs.cloudflare.com/ajax/libs/selectize.js/0.8.5/js/standalone/selectize.min.js", "https://cdnjs.cloudflare.com/ajax/libs/filesaver.js/1.3.3/filesaver.js", "https://cdnjs.cloudflare.com/ajax/libs/gojs/1.7.10/go-debug.js", "js/helpers/Set.js", "js/models/FmmlxProperty.js", "js/models/FmmlxClass.js", "js/models/FmmlxValue.js", "js/models/FmmlxRelationshipEndpoint.js", "js/models/FmmlxAssociation.js", "js/FmmlxShapes/FmmlxProperty.js", "js/FmmlxShapes/FmmlxProperty.js", "js/FmmlxShapes/FmmlxAssociation.js", "js/controllers/StudioController.js", "js/controllers/FormController.js"];

    let deferred = new $.Deferred(), pipe = deferred;

    $.each(scripts, function (i, val) {
        pipe = pipe.pipe(function () {
            return jQuery.ajax({
                type: "GET", url: val, success: console.log("Loaded " + val), dataType: "script", cache: false
            });
        });
    });

    pipe.pipe($.material.init(), console.log("Material Theme initialized"), window.studioController = new Controller.StudioController());

    deferred.resolve();
} else {
    alert("Failed to load Jquery - Can not continue");
}


