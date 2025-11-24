import { internalOrderCreateHandler } from '../handlers/internal-order.handler.js';

export function registerInternalRoutes(app) {
	app.post('/internal/orders/create', internalOrderCreateHandler);
}
