/**
 * Authentication utilities for detecting user vs guest
 */

import { parseCookies } from './cookie.util.js';
import { verifyAccessToken } from '../services/token.service.js';

/**
 * Get user ID from JWT token or guest session ID from cookie
 * @param {Request} request - The incoming request
 * @param {object} env - Cloudflare environment (with DB, JWT_SECRET)
 * @returns {Promise<{type: 'user' | 'guest' | null, id: string | null, user_id?: string, guest_session_id?: string}>}
 */
export async function getUserOrGuest(request, env) {
	// Try to get JWT token from Authorization header
	const authHeader = request.headers.get('Authorization');
	if (authHeader && authHeader.startsWith('Bearer ')) {
		const token = authHeader.substring(7);
		try {
			const payload = await verifyAccessToken(token, env.JWT_SECRET);
			if (payload && payload.sub) {
				return {
					type: 'user',
					id: payload.sub,
					user_id: payload.sub,
				};
			}
		} catch (err) {
			// Invalid token, continue to check guest session
			console.log('[auth] Invalid JWT token, checking guest session');
		}
	}

	// Try to get guest session ID from cookie
	const cookies = parseCookies(request);
	const guestSessionId = cookies.guest_session_id;

	if (guestSessionId) {
		// Verify guest session exists and is not expired
		try {
			const session = await env.DB.prepare(
				'SELECT guest_session_id, expires_at FROM guest_sessions WHERE guest_session_id = ? AND expires_at > datetime("now")',
			)
				.bind(guestSessionId)
				.first();

			if (session) {
				return {
					type: 'guest',
					id: guestSessionId,
					guest_session_id: guestSessionId,
				};
			} else {
				console.log('[auth] Guest session expired or not found');
				return { type: null, id: null };
			}
		} catch (err) {
			console.error('[auth] Error checking guest session:', err);
			return { type: null, id: null };
		}
	}

	return { type: null, id: null };
}
