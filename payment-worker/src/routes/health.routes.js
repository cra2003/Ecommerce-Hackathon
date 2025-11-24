import { rootHandler, healthHandler } from '../handlers/health.handler.js';

export function registerHealthRoutes(app) {
	app.get('/', rootHandler);
	app.get('/health', healthHandler);
}
