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

/**
 * Create a Set-Cookie header string
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {object} options - Cookie options
 * @returns {string} Set-Cookie header value
 */
export function createCookieHeader(name, value, options = {}) {
	const {
		maxAge = null,
		expires = null,
		path = '/',
		domain = null,
		secure = true,
		httpOnly = true,
		sameSite = 'Lax'
	} = options;

	let cookieString = `${name}=${encodeURIComponent(value)}`;

	if (maxAge) {
		cookieString += `; Max-Age=${maxAge}`;
	}

	if (expires) {
		cookieString += `; Expires=${expires.toUTCString()}`;
	}

	if (path) {
		cookieString += `; Path=${path}`;
	}

	if (domain) {
		cookieString += `; Domain=${domain}`;
	}

	if (secure) {
		cookieString += `; Secure`;
	}

	if (httpOnly) {
		cookieString += `; HttpOnly`;
	}

	cookieString += `; SameSite=${sameSite}`;

	return cookieString;
}

