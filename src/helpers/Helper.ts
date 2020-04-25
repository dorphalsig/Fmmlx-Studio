import * as go from 'gojs';

export const Helper = {
  diagram: undefined as go.Diagram | undefined,
  randomString: function () {
    return Math.random().toString(36).substring(2);
  },

  /**
   * Starts a Transaction and returns he TxID
   */
  beginTransaction: function (msg: string, baseName = '') {
    if (!Helper.diagram) throw new Error('no diagram found');
    let id = `${baseName}-${this.randomString()}`;
    Helper.diagram.startTransaction(id);
    console.group(`👉 ${id} :: Begin Transaction ${msg}`);
    return id;
  },

  rollbackTransaction: function () {
    if (!Helper.diagram) throw new Error('no diagram found');
    let txs = Helper.diagram.undoManager.nestedTransactionNames;
    let id = txs.get(txs.length - 1);
    Helper.diagram.rollbackTransaction();
    console.groupEnd();
    console.warn(`❌ ${id} :: Rolled-back Transaction`);
  },

  commitTransaction: function (transId?: string) {
    if (!Helper.diagram) throw new Error('no diagram found');
    Helper.diagram.commitTransaction(transId);
    console.groupEnd();
    console.log(`✅ ${transId} :: Transaction committed`);
  },

};
