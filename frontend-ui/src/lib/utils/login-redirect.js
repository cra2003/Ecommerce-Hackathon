/**
 * Cookie-based login redirect system
 * Stores the current URL in a cookie before redirecting to login
 */

const REDIRECT_COOKIE_NAME = 'login_redirect_url';
const COOKIE_EXPIRY_MINUTES = 10;

/**
 * Save the current URL in a cookie before redirecting to login
 * @param {string} url - The URL to redirect to after login (defaults to current page)
 */
export function saveRedirectBeforeLogin(url = null) {
	if (typeof window === 'undefined') {
		// Server-side: can't set cookies directly, will be handled by server action
		return;
	}

	// Client-side: set cookie using document.cookie
	const targetUrl = url || window.location.pathname + window.location.search;

	// Create expiry date (10 minutes from now)
	const expires = new Date();
	expires.setMinutes(expires.getMinutes() + COOKIE_EXPIRY_MINUTES);

	// Build cookie string
	const cookieValue = encodeURIComponent(targetUrl);
	// secure: false (as requested), httpOnly: false (can't set httpOnly from client)
	const cookieString = `${REDIRECT_COOKIE_NAME}=${cookieValue}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

	// Set cookie
	document.cookie = cookieString;

	console.log('[login-redirect] Saved redirect URL to cookie:', targetUrl);
}

/**
 * Get the redirect URL from cookie (client-side)
 * @returns {string|null} The redirect URL or null
 */
export function getRedirectFromCookie() {
	if (typeof window === 'undefined') {
		return null;
	}

	const cookies = document.cookie.split(';');
	for (let cookie of cookies) {
		const [name, value] = cookie.trim().split('=');
		if (name === REDIRECT_COOKIE_NAME && value) {
			try {
				const decoded = decodeURIComponent(value);
				console.log('[login-redirect] Found redirect URL in cookie:', decoded);
				return decoded;
			} catch (e) {
				console.error('[login-redirect] Failed to decode redirect cookie:', e);
				return null;
			}
		}
	}
	return null;
}

/**
 * Delete the redirect cookie (client-side)
 */
export function deleteRedirectCookie() {
	if (typeof window === 'undefined') {
		return;
	}

	// Set cookie with past expiry date to delete it
	document.cookie = `${REDIRECT_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
	console.log('[login-redirect] Deleted redirect cookie');
}

/**
 * Redirect to login page after saving current URL to cookie
 * @param {string} url - Optional URL to save (defaults to current page)
 */
export function redirectToLogin(url = null) {
	saveRedirectBeforeLogin(url);
	if (typeof window !== 'undefined') {
		window.location.href = '/login';
	}
}
