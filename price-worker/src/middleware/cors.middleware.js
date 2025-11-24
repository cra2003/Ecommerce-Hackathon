import { cors } from 'hono/cors';

// CORS configuration
export default cors({
	origin: '*',
	allowMethods: ['GET', 'OPTIONS'],
	allowHeaders: ['Content-Type'],
});
