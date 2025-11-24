/**
 * Authentication utilities for detecting user vs guest
 */

import { jwtVerify } from 'jose';
import { parseCookies } from './cookie.util.js';

/**
 * Get user ID from JWT token or guest session ID from cookie
 * @param {Request} request - The incoming request
 * @param {object} env - Cloudflare environment
 * @returns {Promise<{type: 'user' | 'guest' | null, user_id?: string, guest_session_id?: string}>}
 */
export async function getUserOrGuest(request, env) {
	// Try to get JWT token from Authorization header
	const authHeader = request.headers.get('Authorization');
	if (authHeader && authHeader.startsWith('Bearer ')) {
		const token = authHeader.substring(7);
		try {
			const { payload } = await jwtVerify(token, new TextEncoder().encode(env.JWT_SECRET));
			const userId = payload?.sub || payload?.user_id || payload?.userId;
			if (userId) {
				return {
					type: 'user',
					user_id: String(userId),
				};
			}
		} catch (err) {
			// Invalid token, continue to check guest session
			console.log('[auth] Invalid JWT token, checking guest session');
		}
	}

	// Try to get guest session ID from header first (preferred for cross-domain)
	// Header is needed because cookies don't cross subdomains (auth-worker vs cart-worker)
	let guestSessionId = request.headers.get('X-Guest-Session-Id');

	// Clean up the header value (remove any whitespace)
	if (guestSessionId) {
		guestSessionId = guestSessionId.trim();
	}

	// Fallback to cookie if header is not present
	if (!guestSessionId) {
		const cookies = parseCookies(request);
		guestSessionId = cookies.guest_session_id;
	}

	console.log('[auth-util] Guest session check:', {
		hasHeader: !!request.headers.get('X-Guest-Session-Id'),
		headerValue: request.headers.get('X-Guest-Session-Id') ? request.headers.get('X-Guest-Session-Id').substring(0, 12) + '...' : null,
		headerLength: request.headers.get('X-Guest-Session-Id') ? request.headers.get('X-Guest-Session-Id').length : 0,
		hasCookie: !!guestSessionId,
		guestSessionId: guestSessionId ? guestSessionId.substring(0, 12) + '...' : null,
		guestSessionIdLength: guestSessionId ? guestSessionId.length : 0,
	});

	if (guestSessionId) {
		// Verify guest session exists and is not expired (query auth-worker if needed)
		// For now, we'll trust the cookie/header and let the constraint in DB handle validation
		return {
			type: 'guest',
			guest_session_id: guestSessionId,
		};
	}

	return { type: null };
}
