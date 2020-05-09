import {diagram} from '../controllers/ViewController';
import {GraphObject} from 'gojs/release/go-module';
import {ShapeEventType, ShapeMouseEvent} from '../shapes/shapeEvents';

export function randomString() {
  return Math.random().toString(36).substring(2);
}
/**
 * Starts a Transaction and returns he TxID
 */
export function beginTransaction(msg: string, baseName = '') {
  let id = `${baseName}-${randomString()}`;
  diagram.startTransaction(id);
  console.group(`👉 ${id} :: Begin Transaction ${msg}`);
  return id;
}

export function rollbackTransaction() {
  let txs = diagram.undoManager.nestedTransactionNames;
  let id = txs.get(txs.length - 1);
  diagram.rollbackTransaction();
  console.groupEnd();
  console.warn(`❌ ${id} :: Rolled-back Transaction`);
}

export function commitTransaction(transId?: string) {
  diagram.commitTransaction(transId);
  console.groupEnd();
  console.log(`✅ ${transId} :: Transaction committed`);
}

export function reEmitAsShapeEvent(event: Event, shape: GraphObject, eventType: ShapeEventType) {
  const shapeEvent = event as ShapeMouseEvent;
  const target = event.target!;
  shapeEvent.shape = shape.part!.data;
  shapeEvent.type = eventType;
  target.dispatchEvent(shapeEvent);
}
