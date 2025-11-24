/**
 * Cookie-based login redirect system
 * Stores the current URL in a cookie before redirecting to login
 */

const REDIRECT_COOKIE_NAME = 'login_redirect_url';
const COOKIE_EXPIRY_MINUTES = 10;

/**
 * Save the current URL in a cookie before redirecting to login
 * Can be used on both server and client side
 * @param {string} url - The URL to redirect to after login (defaults to current page)
 * @param {object} options - Options for cookie setting
 */
export function saveRedirectBeforeLogin(url = null, options = {}) {
	if (typeof window === 'undefined') {
		// Server-side: return the URL to be saved by the server
		return url || '/';
	}

	// Client-side: set cookie using document.cookie
	const targetUrl = url || window.location.pathname + window.location.search;
	
	// Create expiry date (10 minutes from now)
	const expires = new Date();
	expires.setMinutes(expires.getMinutes() + COOKIE_EXPIRY_MINUTES);
	
	// Build cookie string
	const cookieValue = encodeURIComponent(targetUrl);
	const cookieString = `${REDIRECT_COOKIE_NAME}=${cookieValue}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${options.secure ? '; Secure' : ''}`;
	
	// Set cookie
	document.cookie = cookieString;
	
	console.log('[redirect] Saved redirect URL to cookie:', targetUrl);
}

/**
 * Get the redirect URL from cookie (client-side only)
 * @returns {string|null} The redirect URL or null
 */
export function getRedirectFromCookie() {
	if (typeof window === 'undefined') {
		return null;
	}

	const cookies = document.cookie.split(';');
	for (let cookie of cookies) {
		const [name, value] = cookie.trim().split('=');
		if (name === REDIRECT_COOKIE_NAME) {
			try {
				return decodeURIComponent(value || '');
			} catch (e) {
				console.error('[redirect] Failed to decode redirect cookie:', e);
				return null;
			}
		}
	}
	return null;
}

/**
 * Delete the redirect cookie (client-side only)
 */
export function deleteRedirectCookie() {
	if (typeof window === 'undefined') {
		return;
	}

	document.cookie = `${REDIRECT_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
	console.log('[redirect] Deleted redirect cookie');
}

/**
 * Redirect to login page after saving current URL to cookie
 * @param {string} url - Optional URL to save (defaults to current page)
 */
export function redirectToLogin(url = null) {
	saveRedirectBeforeLogin(url);
	window.location.href = '/auth/login';
}

