"use strict";
if (typeof Helper === "undefined") {
    window.Helper = {};
}

Helper.Helper = {

    uuid4: function () {
        //return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
        //8not a UUID, but unique enough and also easier to trace :)
        return Math.random().toString(36).substring(4);
    }

};

