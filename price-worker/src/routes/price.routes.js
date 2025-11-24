import { getPriceHandler, getPriceQueryHandler } from '../handlers/price.handler.js';

export function registerPriceRoutes(app) {
  app.get('/api/price/:sku', getPriceHandler);
  app.get('/api/price', getPriceQueryHandler);
}

