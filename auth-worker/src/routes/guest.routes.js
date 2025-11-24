import { initGuestSession } from '../handlers/guest.handler.js';

const base = '/api/guest';

export function registerGuestRoutes(app) {
	app.post(`${base}/init`, initGuestSession);
}

