/**
 * Cookie parsing utilities for Cloudflare Workers
 */

/**
 * Parse cookies from request headers
 * @param {Request} request - The incoming request
 * @returns {Object} Object with cookie name-value pairs
 */
export function parseCookies(request) {
	const cookieHeader = request.headers.get('Cookie');
	if (!cookieHeader) {
		return {};
	}

	const cookies = {};
	const pairs = cookieHeader.split(';');

	for (const pair of pairs) {
		const [name, ...valueParts] = pair.trim().split('=');
		if (name && valueParts.length > 0) {
			cookies[name] = decodeURIComponent(valueParts.join('='));
		}
	}

	return cookies;
}

/**
 * Get a specific cookie value from request
 * @param {Request} request - The incoming request
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null
 */
export function getCookie(request, name) {
	const cookies = parseCookies(request);
	return cookies[name] || null;
}

