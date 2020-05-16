import {GraphObject} from 'gojs/release/go-module';
import {ShapeEventType, ShapeMouseEvent} from '../shapes/shapeEvents';
import {diagram} from '../controllers/StudioController';

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

export function emitAsShapeEvent(event: Event, shape: GraphObject, eventType: ShapeEventType) {
  console.debug(`Dispatching ${eventType} on a ${event.target}`);
  Object.defineProperty(event, 'shape', {value: shape.part!.data});
  const shapeEvent = new ShapeMouseEvent(eventType, event as any);
  event.target!.dispatchEvent(shapeEvent);
}
