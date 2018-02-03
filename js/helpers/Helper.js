"use strict";
if (typeof Helper === "undefined") {
    window.Helper = {};
}

Helper.Helper = {

    uuid4: function () {
        //return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
        //8not a UUID, but unique enough and also easier to trace :)
        return Math.random().toString(36).substring(4);
    },

    fixNameBlock: function (nameBlock, targetRight = true) {
        let sourceIntrinsicness = nameBlock.findObject("sourceIntrinsicness");
        let targetIntrinsicness = nameBlock.findObject("targetIntrinsicness");
        nameBlock.remove(sourceIntrinsicness);
        nameBlock.remove(targetIntrinsicness);


        if (targetRight) {
            nameBlock.insertAt(0, sourceIntrinsicness);
            nameBlock.add(targetIntrinsicness);
            nameBlock.findObject("leftArrow").visible = false;
            nameBlock.findObject("rightArrow").visible = true;
            return;
        }

        nameBlock.insertAt(0, targetIntrinsicness);
        nameBlock.add(sourceIntrinsicness);
        nameBlock.findObject("leftArrow").visible = true;
        nameBlock.findObject("rightArrow").visible = false;
        nameBlock.segmentOffset = new go.Point(0, 15);
    },

    fixLabels: function (link) {
        let nameBlock = link.findObject("nameBlock");
        let referenceBlock = link.findObject("referenceBlock");
        let sourceRole = link.findObject("sourceRole");
        let sourceCardinality = link.findObject("sourceCardinality");
        let targetRole = link.findObject("targetRole");
        let targetCardinality = link.findObject("targetCardinality");
        try {
            let transId = Helper.Helper.beginTransaction("Fixing labels...");
            if (link.midAngle !== 180) {
                sourceRole.segmentOffset = new go.Point(NaN, -15);
                nameBlock.segmentOffset = new go.Point(0, -15);
                targetRole.segmentOffset = new go.Point(NaN, -15);
                sourceCardinality.segmentOffset = new go.Point(NaN, 15);
                referenceBlock.segmentOffset = new go.Point(0, 15);
                targetCardinality.segmentOffset = new go.Point(NaN, 15);
                this.fixNameBlock(nameBlock, true)
                Helper.Helper.commitTransaction(transId);
                return;
            }
            sourceRole.segmentOffset = new go.Point(NaN, 15);
            nameBlock.segmentOffset = new go.Point(0, 15);
            targetRole.segmentOffset = new go.Point(NaN, 15);
            sourceCardinality.segmentOffset = new go.Point(NaN, -15);
            referenceBlock.segmentOffset = new go.Point(0, -15);
            targetCardinality.segmentOffset = new go.Point(NaN, -15);
            this.fixNameBlock(nameBlock, false);
            Helper.Helper.commitTransaction(transId);
        }
        catch (error) {
            Helper.Helper.rollbackTransaction();
            throw error;
        }
    },

    /**
     * Starts a Transaction and returns he TxID
     * @param {String} msg
     * @return {String}
     */
    beginTransaction: function (msg) {
        let id = this.uuid4();
        diagram.startTransaction(id);
        console.group(`👉 ${id} :: Begin Transaction ${msg}`);
        return id;
    },

    rollbackTransaction: function () {
        let id = diagram.undoManager.currentTransaction;
        diagram.rollbackTransaction();
        console.groupEnd();
        console.warn(`❌ ${id} :: Rolled-back Transaction`);
    },

    commitTransaction: function (transId) {
        diagram.commitTransaction(transId);
        console.groupEnd();
        console.log(`✅ ${transId} :: Transaction committed`);
    }
};

