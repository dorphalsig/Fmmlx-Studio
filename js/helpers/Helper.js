"use strict";
if (typeof Helper === "undefined") {
    window.Helper = {};
}

Helper.Helper = {

    generateId: function () {
        //return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
        //8not a UUID, but unique enough and also easier to trace :)
        return Math.random().toString(36).substring(4);
    },


    fixNameBlock: function (nameBlock) {

        const link = nameBlock.part;
        let targetRight;
        switch (nameBlock.angle) {
            case 0:
                targetRight = link.points.get(0).x < link.points.get(link.pointsCount - 1).x;
                break;
            case 90:
                targetRight = true;
                break;
            case 270:
                targetRight = false;
        }


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
    },

    /**
     *  Aligns labels and takes care of them pointing where they should
     * @param {go.Link} link
     */
    /**
     *  Aligns labels and takes care of them pointing where they should
     * @param {go.Link} link
     */
    fixLabels: function (link) {

        let nameBlock = link.findObject("nameBlock");
        let referenceBlock = link.findObject("referenceBlock");

        const segment = link.findClosestSegment(new go.Point(link.midPoint.x + 10, link.midPoint.y + 10));
        const segmentLength = Math.sqrt(link.points.get(segment).distanceSquaredPoint(link.points.get(segment + 1)));
        const labelLength = Math.max(nameBlock.naturalBounds.width, referenceBlock.naturalBounds.width);

        const orientation = (segmentLength / labelLength < 0.4) ? go.Link.None : go.Link.OrientUpright;

        let transId = Helper.Helper.beginTransaction("Fixing labels...");

        try {
            nameBlock.segmentIndex = segment;
            nameBlock.segmentFraction = 0.5;
            nameBlock.segmentOrientation = orientation;

            referenceBlock.segmentIndex = segment;
            referenceBlock.segmentFraction = 0.5;
            referenceBlock.segmentOrientation = orientation;


            if (nameBlock.angle > 90) {
                nameBlock.segmentOffset = new go.Point(0, 15);
                referenceBlock.segmentOffset = new go.Point(0, -15);
            }
            else {
                nameBlock.segmentOffset = new go.Point(0, -15);
                referenceBlock.segmentOffset = new go.Point(0, 15);
            }
            //fix the label arrows and get stuff sorted correctly
            this.fixNameBlock(nameBlock);

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
    beginTransaction: function (msg, baseName = "") {
        let id = `${baseName}-${this.generateId()}`;
        diagram.startTransaction(id);
        console.group(`👉 ${id} :: Begin Transaction ${msg}`);
        return id;
    },

    rollbackTransaction: function () {
        let txs = diagram.undoManager.nestedTransactionNames;
        let id = txs.get(txs.length - 1);
        diagram.rollbackTransaction();
        console.groupEnd();
        console.warn(`❌ ${id} :: Rolled-back Transaction`);
    },

    commitTransaction: function (transId) {
        diagram.commitTransaction(transId);
        console.groupEnd();
        console.log(`✅ ${transId} :: Transaction committed`);
    },

    /**
     * Changes the visibility of all nodes
     * @param {boolean} visible if true the nodes are visible, else they are not.
     */
    setNodesVisibility: function (visible) {
        let transId = this.beginTransaction("Hiding/Showing all nodes");
        try {
            diagram.nodes.each(node => node.visible = visible);
            this.commitTransaction(transId);
        }
        catch (err) {
            this.rollbackTransaction();
            throw err;
        }
    },
};

