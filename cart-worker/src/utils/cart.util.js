/**
 * Cart utilities for handling user vs guest identification
 */

/**
 * Get user/guest identifier from context
 * @param {Context} c - Hono context
 * @returns {Object} { user_id, guest_session_id, identifier, cacheKey }
 */
export function getCartIdentifier(c) {
	const user_id = c.get('user_id');
	const guest_session_id = c.get('guest_session_id');
	
	if (user_id) {
		return {
			user_id,
			guest_session_id: null,
			identifier: user_id,
			cacheKey: `cart:${user_id}`,
			type: 'user'
		};
	} else if (guest_session_id) {
		return {
			user_id: null,
			guest_session_id,
			identifier: guest_session_id,
			cacheKey: `cart:guest:${guest_session_id}`,
			type: 'guest'
		};
	}
	
	return {
		user_id: null,
		guest_session_id: null,
		identifier: null,
		cacheKey: null,
		type: null
	};
}

