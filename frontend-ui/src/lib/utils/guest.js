/**
 * Guest checkout utilities
 */

/**
 * Set guest session ID in a cookie
 * @param {string} guestSessionId - The guest session ID
 */
export function setGuestSessionCookie(guestSessionId) {
	if (typeof document === 'undefined') return;
	
	// Set cookie that expires in 6 hours (21600 seconds)
	const expires = new Date();
	expires.setHours(expires.getHours() + 6);
	
	// Set cookie with proper attributes
	// Path=/ makes it available to all paths
	// SameSite=Lax allows cross-site requests
	// Secure will be true if on HTTPS
	const cookieString = `guest_session_id=${encodeURIComponent(guestSessionId)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
	
	document.cookie = cookieString;
	console.log('[guest] Set guest_session_id cookie');
}

/**
 * Check if user has a guest session cookie
 * @returns {boolean}
 */
export function hasGuestSession() {
	if (typeof document === 'undefined') return false;
	
	const cookies = document.cookie.split(';');
	return cookies.some(cookie => {
		const [name] = cookie.trim().split('=');
		return name === 'guest_session_id';
	});
}

/**
 * Get guest session ID from cookie
 * @returns {string|null}
 */
export function getGuestSessionId() {
	if (typeof document === 'undefined') return null;
	
	const cookies = document.cookie.split(';');
	for (const cookie of cookies) {
		const [name, value] = cookie.trim().split('=');
		if (name === 'guest_session_id' && value) {
			try {
				return decodeURIComponent(value);
			} catch (e) {
				return value; // Return as-is if decoding fails
			}
		}
	}
	return null;
}

/**
 * Delete guest session cookie
 */
export function deleteGuestSessionCookie() {
	if (typeof document === 'undefined') return;
	
	// Set cookie with past expiry date to delete it
	document.cookie = 'guest_session_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
	console.log('[guest] Deleted guest_session_id cookie');
}

