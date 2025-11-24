/**
 * Middleware that allows either authenticated user OR guest session
 * Sets either 'user_id' or 'guest_session_id' in context
 */

import { getUserOrGuest } from '../utils/auth.util.js';

export default async function authOrGuestMiddleware(c, next) {
	const authInfo = await getUserOrGuest(c.req.raw, c.env);

	console.log('[auth-or-guest-middleware] Auth info:', {
		type: authInfo.type,
		user_id: authInfo.user_id || null,
		guest_session_id: authInfo.guest_session_id ? authInfo.guest_session_id.substring(0, 8) + '...' : null,
	});

	if (authInfo.type === 'user') {
		c.set('user_id', authInfo.user_id);
		c.set('guest_session_id', null);
		await next();
	} else if (authInfo.type === 'guest') {
		c.set('user_id', null);
		c.set('guest_session_id', authInfo.guest_session_id);
		console.log('[auth-or-guest-middleware] Set guest_session_id in context');
		await next();
	} else {
		console.log('[auth-or-guest-middleware] No auth or guest - returning 401');
		return c.json(
			{
				success: false,
				error: 'Authentication required. Please log in or continue as guest.',
			},
			401,
		);
	}
}
