const DEFAULT_PRICE = 12995; // INR

// Discover product images at build-time
// Place images under src/lib/assets/products/*
const imageModules = import.meta.glob('$lib/assets/products/*.{png,jpg,jpeg,webp}', {
	eager: true,
	as: 'url',
});

function slugify(filePath) {
	const base = filePath.split('/').pop() || '';
	return base
		.replace(/\.(png|jpe?g|webp)$/i, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-');
}

export function getAllProducts() {
	const entries = Object.entries(imageModules).sort((a, b) => a[0].localeCompare(b[0]));
	return entries.map(([path, url], i) => {
		const slug = slugify(path);
		const name = slug.replace(/-/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
		return {
			id: i + 1,
			slug,
			name,
			image: url,
			price: DEFAULT_PRICE,
			inStock: true,
		};
	});
}

export function getProductBySlug(slug) {
	return getAllProducts().find(p => p.slug === slug);
}

// Auth API (optional)
const AUTH_API = import.meta.env.VITE_AUTH_API || 'https://auth-worker.aadhi18082003.workers.dev';

export async function registerUser(payload) {
	try {
		const res = await fetch(`${AUTH_API}/api/auth/register`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload),
			credentials: 'include',
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			throw new Error(data.error || `Registration failed (${res.status})`);
		}
		return data;
	} catch (err) {
		if (err instanceof TypeError && err.message.includes('fetch')) {
			throw new Error('Network error: Could not reach auth server. Is it deployed?');
		}
		throw err;
	}
}

export async function loginUser(payload) {
	try {
		const res = await fetch(`${AUTH_API}/api/auth/login`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload),
			credentials: 'include',
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			throw new Error(data.error || `Login failed (${res.status})`);
		}
		return data;
	} catch (err) {
		if (err instanceof TypeError && err.message.includes('fetch')) {
			throw new Error('Network error: Could not reach auth server. Is it deployed?');
		}
		throw err;
	}
}

export async function refreshSession() {
	const res = await fetch(`${AUTH_API}/api/auth/refresh`, {
		method: 'POST',
		credentials: 'include',
	});
	if (!res.ok) throw new Error('Refresh failed');
	return res.json();
}

export async function logoutSession() {
	await fetch(`${AUTH_API}/api/auth/logout`, {
		method: 'POST',
		credentials: 'include',
	});
	return { ok: true };
}

export async function fetchMe(token, minimal = false) {
	const url = minimal ? `${AUTH_API}/api/auth/me?minimal=true` : `${AUTH_API}/api/auth/me`;
	const res = await fetch(url, {
		headers: { authorization: `Bearer ${token}` },
		credentials: 'include',
	});
	if (!res.ok) throw new Error('Unauthorized');
	return res.json();
}

// Cart API
const CART_API = import.meta.env.VITE_CART_API || 'https://cart-worker.aadhi18082003.workers.dev';
const PAYMENT_API = import.meta.env.VITE_PAYMENT_API || 'https://payment-worker.aadhi18082003.workers.dev';
const ORDER_API = import.meta.env.VITE_ORDER_API || 'https://orders-worker.aadhi18082003.workers.dev';

// Import guest utilities
import { getGuestSessionId } from '$lib/utils/guest.js';

/**
 * Build headers for API requests that support both authenticated users and guests
 * @param {string|null} token - JWT token for authenticated users
 * @param {object} additionalHeaders - Additional headers to include
 * @returns {object} Headers object
 */
function buildAuthHeaders(token = null, additionalHeaders = {}) {
	const headers = {
		'Content-Type': 'application/json',
		...additionalHeaders,
	};

	if (token) {
		headers.authorization = `Bearer ${token}`;
		console.log('[buildAuthHeaders] Using JWT token for auth');
	} else {
		// Check for guest session ID from cookie and send as header
		const guestSessionId = getGuestSessionId();
		if (guestSessionId) {
			headers['X-Guest-Session-Id'] = guestSessionId;
			console.log(
				'[buildAuthHeaders] Adding X-Guest-Session-Id header:',
				guestSessionId.substring(0, 8) + '...',
				'(full length:',
				guestSessionId.length + ')'
			);
		} else {
			console.warn('[buildAuthHeaders] WARNING: No guest session ID found in cookie!');
			console.log('[buildAuthHeaders] All cookies:', typeof document !== 'undefined' ? document.cookie : 'N/A (SSR)');
		}
	}

	console.log('[buildAuthHeaders] Final headers:', Object.keys(headers).join(', '));
	return headers;
}

export async function addProductToCart(token, payload) {
	// Add timeout to prevent hanging
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

	try {
		// Build headers for both authenticated users and guests
		const headers = buildAuthHeaders(token);
		console.log('[addProductToCart] Request headers:', { hasAuth: !!token, hasGuestHeader: !!headers['X-Guest-Session-Id'] });

		const res = await fetch(`${CART_API}/cart/add`, {
			method: 'POST',
			headers,
			body: JSON.stringify(payload),
			credentials: 'include',
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		let data = null;
		try {
			data = await res.json();
		} catch {
			// ignore
		}
		if (!res.ok) {
			const msg = data?.error || data?.message || `Failed to add to cart (${res.status})`;
			throw new Error(msg);
		}
		return data;
	} catch (err) {
		clearTimeout(timeoutId);
		if (err.name === 'AbortError') {
			throw new Error('Request timed out. The item may have been added - please check your cart.');
		}
		throw err;
	}
}

export async function getCart(token = null) {
	// Support both authenticated users and guest sessions
	const headers = buildAuthHeaders(token);
	console.log('[getCart] Request headers:', {
		hasAuth: !!token,
		hasGuestHeader: !!headers['X-Guest-Session-Id'],
		guestSessionId: headers['X-Guest-Session-Id'] ? headers['X-Guest-Session-Id'].substring(0, 8) + '...' : null,
	});

	const res = await fetch(`${CART_API}/cart`, {
		headers,
		credentials: 'include', // Important for guest cookie
	});

	console.log('[getCart] Response status:', res.status);

	if (!res.ok) {
		const errorData = await res.json().catch(() => ({}));
		console.error('[getCart] Error response:', errorData);
		throw new Error(errorData.error || 'Failed to fetch cart');
	}

	const data = await res.json();
	console.log('[getCart] Success:', {
		success: data.success,
		hasCart: !!data.cart,
		cartNull: data.cart === null,
		itemCount: data.cart?.products?.length || 0,
	});
	return data;
}

export async function verifyCartStock(token = null) {
	const headers = buildAuthHeaders(token);
	console.log('[verifyCartStock] 🔐 Request headers:', {
		hasAuth: !!token,
		hasGuestHeader: !!headers['X-Guest-Session-Id'],
		headers: Object.keys(headers),
	});

	const url = `${CART_API}/cart/verify-stock`;
	console.log('[verifyCartStock] 🌐 Fetching:', url);

	const res = await fetch(url, {
		method: 'POST',
		headers,
		credentials: 'include',
	});

	console.log('[verifyCartStock] 📥 Response status:', res.status, res.statusText);

	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		console.error('[verifyCartStock] ❌ Error response:', data);
		throw new Error(data.error || 'Stock verification failed');
	}

	const data = await res.json();
	console.log('[verifyCartStock] ✅ Success response:', data);
	return data;
}

export async function saveShippingAddress(token = null, address) {
	const headers = buildAuthHeaders(token);
	console.log('[saveShippingAddress] Request headers:', {
		hasAuth: !!token,
		hasGuestHeader: !!headers['X-Guest-Session-Id'],
	});

	const res = await fetch(`${CART_API}/cart/shipping`, {
		method: 'POST',
		headers,
		body: JSON.stringify(address),
		credentials: 'include',
	});

	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.error || 'Failed to save shipping address');
	}
	return res.json();
}

export async function getOrderSummary(token = null) {
	const headers = buildAuthHeaders(token);
	console.log('[getOrderSummary] Request headers:', {
		hasAuth: !!token,
		hasGuestHeader: !!headers['X-Guest-Session-Id'],
	});

	const res = await fetch(`${CART_API}/cart/summary`, {
		headers,
		credentials: 'include',
	});
	const data = await res.json().catch(() => ({}));
	// Return the data even if res.ok is false, so frontend can handle non-deliverable cases
	// The data will have success: false and summary object for non-deliverable products
	return data;
}

export async function placeOrder(token = null, delivery_mode = 'standard', payment_status = 'pending') {
	const headers = buildAuthHeaders(token);

	const res = await fetch(`${CART_API}/cart/place-order`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ delivery_mode, payment_status }),
		credentials: 'include',
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok || !data.success) {
		throw new Error(data.error || `Order failed (${res.status})`);
	}
	return data;
}

export async function saveAddressToProfile(token, address) {
	const res = await fetch(`${AUTH_API}/api/auth/addresses`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(address),
		credentials: 'include',
	});
	if (!res.ok) throw new Error('Failed to save address to profile');
	return res.json();
}

// New: sync local items to backend
export async function syncCart(token, items) {
	const res = await fetch(`${CART_API}/cart/sync`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ items }),
		credentials: 'include',
	});
	if (!res.ok) throw new Error('Failed to sync cart');
	return res.json();
}

// New: increment quantity
export async function incrementCartQuantity(token = null, { product_id, size }) {
	// Double-check guest session before building headers
	const hasGuestSession = typeof document !== 'undefined' && document.cookie.includes('guest_session_id=');
	console.log('[incrementCartQuantity] Starting request:', {
		hasToken: !!token,
		hasGuestSession,
		product_id,
		size,
		allCookies: typeof document !== 'undefined' ? document.cookie : 'N/A',
	});

	const headers = buildAuthHeaders(token);
	console.log('[incrementCartQuantity] Request headers:', {
		hasAuth: !!token,
		hasGuestHeader: !!headers['X-Guest-Session-Id'],
		guestSessionId: headers['X-Guest-Session-Id'] ? headers['X-Guest-Session-Id'].substring(0, 12) + '...' : null,
		headersKeys: Object.keys(headers),
	});

	const res = await fetch(`${CART_API}/cart/increment`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ product_id, size }),
		credentials: 'include',
	});

	console.log('[incrementCartQuantity] Response status:', res.status, res.statusText);

	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		console.error('[incrementCartQuantity] ERROR - Response data:', data);
		console.error('[incrementCartQuantity] ERROR - Status:', res.status);
		const errorMsg = data.error || data.message || `Failed to increment quantity (${res.status})`;
		throw new Error(errorMsg);
	}

	const responseData = await res.json();
	console.log('[incrementCartQuantity] Success:', responseData);
	return responseData;
}

// New: decrement quantity
export async function decrementCartQuantity(token = null, { product_id, size }) {
	const headers = buildAuthHeaders(token);
	console.log('[decrementCartQuantity] Request headers:', {
		hasAuth: !!token,
		hasGuestHeader: !!headers['X-Guest-Session-Id'],
	});

	const res = await fetch(`${CART_API}/cart/decrement`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ product_id, size }),
		credentials: 'include',
	});

	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		console.error('[decrementCartQuantity] Error response:', data);
		throw new Error(data.error || 'Failed to decrement quantity');
	}
	return res.json();
}

// New: remove a single item
export async function removeCartItem(token = null, { product_id, size }) {
	const res = await fetch(`${CART_API}/cart/item`, {
		method: 'DELETE',
		headers: buildAuthHeaders(token),
		body: JSON.stringify({ product_id, size }),
		credentials: 'include',
	});
	if (!res.ok) throw new Error('Failed to remove item');
	return res.json();
}

// New: clear entire cart
export async function clearCartApi(token = null) {
	const res = await fetch(`${CART_API}/cart`, {
		method: 'DELETE',
		headers: buildAuthHeaders(token),
		credentials: 'include',
	});
	if (!res.ok) throw new Error('Failed to clear cart');
	return res.json();
}

// Payment API (PayPal Sandbox via payment-worker)
export async function createPayment(total, currency = 'USD', description = 'Order payment', returnUrl, cancelUrl) {
	const res = await fetch(`${PAYMENT_API}/payment/create`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify({
			total,
			currency,
			description,
			return_url: returnUrl,
			cancel_url: cancelUrl,
		}),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok || !data.success) {
		throw new Error(data.error || `Failed to create payment (${res.status})`);
	}
	return data;
}

export async function capturePayment(paypal_order_id) {
	const res = await fetch(`${PAYMENT_API}/payment/capture`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify({ paypal_order_id }),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok || !data.success) {
		// Build detailed error message
		let errorMsg = data.error || `Failed to capture payment (${res.status})`;

		// Add details if available
		if (data.details) {
			errorMsg += `. ${data.details}`;
		}

		// Add helpful text for common errors
		if (data.help_text) {
			errorMsg += `. ${data.help_text}`;
		}

		// Check for PayPal-specific errors
		if (data.paypal_error_name === 'UNPROCESSABLE_ENTITY') {
			errorMsg =
				data.error ||
				'Payment validation failed. The requested action could not be performed, semantically incorrect, or failed business validation.';
			if (data.details) {
				errorMsg += ` ${data.details}`;
			}
		}

		console.error('[capturePayment] Payment capture failed:', {
			status: res.status,
			paypal_order_id,
			error: data.error,
			details: data.details,
			paypal_error_name: data.paypal_error_name,
		});

		throw new Error(errorMsg);
	}
	return data;
}

// Orders API
export async function cancelOrder(token, orderId) {
	const res = await fetch(`${ORDER_API}/orders/${encodeURIComponent(orderId)}`, {
		method: 'DELETE',
		headers: {
			authorization: `Bearer ${token}`,
		},
		credentials: 'include',
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		const errorMsg = data.error || data.message || `Failed to cancel order (${res.status})`;
		throw new Error(errorMsg);
	}
	return data;
}

export async function getOrders(token) {
	console.log('[getOrders] Making request to:', `${ORDER_API}/orders`);
	console.log('[getOrders] Token present:', !!token);
	console.log('[getOrders] Token preview:', token ? `${token.substring(0, 20)}...` : 'none');

	if (!token) {
		throw new Error('No authentication token available. Please log in again.');
	}

	try {
		const res = await fetch(`${ORDER_API}/orders`, {
			headers: {
				authorization: `Bearer ${token}`,
			},
			credentials: 'include',
		});

		console.log('[getOrders] Response status:', res.status, res.statusText);
		console.log('[getOrders] Response headers:', Object.fromEntries(res.headers.entries()));

		const text = await res.text();
		console.log('[getOrders] Response body (raw):', text);

		let data = {};
		try {
			data = JSON.parse(text);
		} catch (e) {
			console.error('[getOrders] Failed to parse JSON:', e);
			throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
		}

		if (!res.ok) {
			const errorMsg = data.error || data.message || `Failed to fetch orders (${res.status})`;
			console.error('[getOrders] API error:', res.status, data);
			throw new Error(errorMsg);
		}

		console.log('[getOrders] Success, response:', data);
		return data;
	} catch (err) {
		console.error('[getOrders] Fetch exception:', err);
		throw err;
	}
}
