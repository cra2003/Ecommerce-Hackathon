/**
 * Get the login URL with redirect parameter
 * @param {string} redirectTo - The URL to redirect to after login
 * @returns {string} Login URL with redirect parameter
 */
export function getLoginUrl(redirectTo = null) {
	if (typeof window === 'undefined') {
		return '/login';
	}

	// If no redirect URL provided, use current page
	const targetUrl = redirectTo || window.location.pathname + window.location.search;

	// Encode the redirect URL
	const encoded = encodeURIComponent(targetUrl);
	return `/login?redirect=${encoded}`;
}

/**
 * Get the redirect URL from query parameters
 * @param {URLSearchParams} searchParams - URL search parameters
 * @returns {string|null} The redirect URL or null
 */
export function getRedirectUrl(searchParams) {
	const redirect = searchParams.get('redirect');
	if (!redirect) {
		return null;
	}

	try {
		// Decode the redirect URL
		return decodeURIComponent(redirect);
	} catch (e) {
		console.error('[redirect] Failed to decode redirect URL:', e);
		return null;
	}
}
