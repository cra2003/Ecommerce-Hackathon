import { fulfillmentCheckHandler } from '../handlers/fulfillment-check.handler.js';
import { fulfillmentLockHandler, fulfillmentUnlockHandler } from '../handlers/fulfillment-lock.handler.js';
import { stockDeductHandler } from '../handlers/stock-deduct.handler.js';
import { stockRestoreHandler } from '../handlers/stock-restore.handler.js';

export function registerFulfillmentRoutes(app) {
  app.post('/api/fulfillment/check', fulfillmentCheckHandler);
  app.post('/api/fulfillment/lock', fulfillmentLockHandler);
  app.post('/api/fulfillment/unlock', fulfillmentUnlockHandler);
  app.post('/api/stock/deduct', stockDeductHandler);
  app.post('/api/stock/restore', stockRestoreHandler);
}

