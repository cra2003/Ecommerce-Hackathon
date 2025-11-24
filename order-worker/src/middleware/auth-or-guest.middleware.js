/**
 * Middleware that allows either authenticated user OR guest session
 * Sets either 'user_id' or 'guest_session_id' in context
 */

import { getUserOrGuest } from '../utils/auth.util.js';

export default async function authOrGuestMiddleware(c, next) {
	const authInfo = await getUserOrGuest(c.req.raw, c.env);

	if (authInfo.type === 'user') {
		c.set('user_id', authInfo.user_id);
		c.set('guest_session_id', null);
		await next();
	} else if (authInfo.type === 'guest') {
		c.set('user_id', null);
		c.set('guest_session_id', authInfo.guest_session_id);
		await next();
	} else {
		return c.json({ 
			success: false, 
			error: 'Authentication required. Please log in or continue as guest.' 
		}, 401);
	}
}

