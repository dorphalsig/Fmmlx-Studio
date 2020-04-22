import * as gojs from 'gojs';

export const Helper ={
  generateId: function () {
    return Math.random().toString(36).substring(4);
  },

  fixNameBlock: function (nameBlock: gojs.Panel, targetRight = true) {
    let sourceIntrinsicness = nameBlock.findObject('sourceIntrinsicness');
    let targetIntrinsicness = nameBlock.findObject('targetIntrinsicness');
    nameBlock.remove(sourceIntrinsicness);
    nameBlock.remove(targetIntrinsicness);

    if (targetRight) {
      nameBlock.insertAt(0, sourceIntrinsicness);
      nameBlock.add(targetIntrinsicness);
      nameBlock.findObject('leftArrow').visible = false;
      nameBlock.findObject('rightArrow').visible = true;
      return;
    }

    nameBlock.insertAt(0, targetIntrinsicness);
    nameBlock.add(sourceIntrinsicness);
    nameBlock.findObject('leftArrow').visible = true;
    nameBlock.findObject('rightArrow').visible = false;
    nameBlock.segmentOffset = new gojs.Point(0, 15);
  },

  /**
   * Makes sure that in a link label the intrinsicness boxes are rotated
   * with the link, but are not upside down
   * @param link
   */
  fixLabels: function (link: gojs.Link) {
    const nameBlock = link.findObject('nameBlock') as gojs.Panel;
    const referenceBlock = link.findObject('referenceBlock');
    const sourceRole = link.findObject('sourceRole');
    const sourceCardinality = link.findObject('sourceCardinality');
    const targetRole = link.findObject('targetRole');
    const targetCardinality = link.findObject('targetCardinality');
    try {
      let transId = this.beginTransaction('Fixing labels...', link.diagram);
      if (link.midAngle !== 180) {
        sourceRole.segmentOffset = new gojs.Point(NaN, -15);
        nameBlock.segmentOffset = new gojs.Point(0, -15);
        targetRole.segmentOffset = new gojs.Point(NaN, -15);
        sourceCardinality.segmentOffset = new gojs.Point(NaN, 15);
        referenceBlock.segmentOffset = new gojs.Point(0, 15);
        targetCardinality.segmentOffset = new gojs.Point(NaN, 15);
        this.fixNameBlock(nameBlock, true);
        this.commitTransaction(transId, link.diagram);
        return;
      }
      sourceRole.segmentOffset = new gojs.Point(NaN, 15);
      nameBlock.segmentOffset = new gojs.Point(0, 15);
      targetRole.segmentOffset = new gojs.Point(NaN, 15);
      sourceCardinality.segmentOffset = new gojs.Point(NaN, -15);
      referenceBlock.segmentOffset = new gojs.Point(0, -15);
      targetCardinality.segmentOffset = new gojs.Point(NaN, -15);
      this.fixNameBlock(nameBlock, false);
      this.commitTransaction(transId, link.diagram);
    } catch (error) {
      this.rollbackTransaction(link.diagram);
      throw error;
    }
  },

  /**
   * Starts a Transaction and returns he TxID
   */
  beginTransaction: function (msg: string, diagram: gojs.Diagram, baseName = '') {
    let id = `${baseName}-${this.generateId()}`;
    diagram.startTransaction(id);
    console.group(`👉 ${id} :: Begin Transaction ${msg}`);
    return id;
  },

  rollbackTransaction: function (diagram: gojs.Diagram) {
    let txs = diagram.undoManager.nestedTransactionNames;
    let id = txs.get(txs.length - 1);
    diagram.rollbackTransaction();
    console.groupEnd();
    console.warn(`❌ ${id} :: Rolled-back Transaction`);
  },

  commitTransaction: function (transId: string, diagram: gojs.Diagram) {
    diagram.commitTransaction(transId);
    console.groupEnd();
    console.log(`✅ ${transId} :: Transaction committed`);
  },

  /**
   * Changes the visibility of all nodes
   */
  setNodesVisibility: function (visible: boolean, diagram: gojs.Diagram) {
    const transId = this.beginTransaction('Hiding/Showing all nodes', diagram);
    try {
      diagram.nodes.each(node => (node.visible = visible));
      this.commitTransaction(transId, diagram);
    } catch (err) {
      this.rollbackTransaction(diagram);
      throw err;
    }
  },
};
