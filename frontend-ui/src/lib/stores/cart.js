import { writable, derived, get } from 'svelte/store';
import { accessToken } from './auth.js';
import {
	addProductToCart,
	getCart,
	verifyCartStock,
	incrementCartQuantity,
	decrementCartQuantity,
	removeCartItem,
	clearCartApi,
} from '$lib/utils/api.js';
import { hasGuestSession } from '$lib/utils/guest.js';

// Local cart items (frontend state, synced with backend on load)
export const cartItems = writable([]);
export const isLoadingCart = writable(false);

// Show number of distinct items in cart (not total quantity)
export const cartCount = derived(cartItems, $items => $items.length);
export const cartTotal = derived(cartItems, $items => $items.reduce((s, it) => s + it.quantity * it.price, 0));

// Load cart from backend (optimized with timeout)
// Supports both authenticated users and guest sessions
export async function loadCart() {
	const token = get(accessToken);
	const isGuest = hasGuestSession();

	// Don't block - always try to load cart (cookies sent automatically)
	// Even if frontend hasn't detected guest session, backend might have it

	isLoadingCart.set(true);
	try {
		// Add timeout to prevent hanging
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => reject(new Error('Cart load timeout')), 10000); // 10 second timeout
		});

		// Pass token only if authenticated (guests use cookie/header)
		const cartPromise = getCart(token || null);
		const data = await Promise.race([cartPromise, timeoutPromise]);

		console.log('[cart-store] Cart loaded:', {
			success: data.success,
			hasCart: !!data.cart,
			itemCount: data.cart?.products?.length || 0,
			isNull: data.cart === null,
		});

		if (data.success) {
			// Check if cart exists and has products
			if (data.cart && data.cart.products && Array.isArray(data.cart.products) && data.cart.products.length > 0) {
				// Transform backend format to frontend format
				const items = data.cart.products.map(p => ({
					id: p.product_id,
					slug: p.product_id,
					sku: p.sku,
					name: p.name,
					image: p.image || '',
					price: p.price || 0,
					size: p.size,
					quantity: p.quantity || 1,
				}));
				cartItems.set(items);
				console.log('[cart-store] Cart items set:', items.length, 'items');
			} else {
				// Cart exists but is empty (no products), or cart is null (not created yet)
				cartItems.set([]);
				console.log('[cart-store] Cart is empty or not created yet');
			}
		} else {
			console.error('[cart-store] Cart load failed:', data);
			cartItems.set([]);
		}
	} catch (err) {
		console.error('[cart] Failed to load cart:', err);
		// Don't clear cart on error - keep existing items
		// cartItems.set([]);
	} finally {
		isLoadingCart.set(false);
	}
}

// Add product to cart (calls backend)
export async function addToCart(product, size, qty = 1) {
	const token = get(accessToken);
	if (!token) {
		throw new Error('Please log in to add items to cart');
	}

	const payload = {
		product_id: product.id,
		sku: product.sku,
		size,
		quantity: qty,
	};

	// Just call the API - don't reload cart here, let cart page handle it
	const result = await addProductToCart(token, payload);

	// DON'T reload cart here - it causes the page to hang
	// Cart will be loaded when user navigates to cart page

	return { success: true };
}

// Increment quantity (calls backend directly)
export async function incrementQuantity(productId, size) {
	const token = get(accessToken);
	const isGuest = hasGuestSession();

	if (!token && !isGuest) {
		throw new Error('Please log in or continue as guest to update cart');
	}

	try {
		await incrementCartQuantity(token || null, { product_id: productId, size });
		// Reload cart from backend to get updated state
		await loadCart();
		return { success: true };
	} catch (err) {
		console.error('[cart] Failed to increment quantity:', err);
		throw err;
	}
}

// Decrement quantity (calls backend directly)
export async function decrementQuantity(productId, size) {
	const token = get(accessToken);
	const isGuest = hasGuestSession();

	if (!token && !isGuest) {
		throw new Error('Please log in or continue as guest to update cart');
	}

	try {
		const result = await decrementCartQuantity(token || null, { product_id: productId, size });
		// Reload cart from backend to get updated state
		await loadCart();
		// If item was removed (quantity reached 0), cart is already updated
		return { success: true, removed: result.removed };
	} catch (err) {
		console.error('[cart] Failed to decrement quantity:', err);
		throw err;
	}
}

// Remove item from cart
export async function removeFromCart(productId, size) {
	const token = get(accessToken);
	const isGuest = hasGuestSession();

	if (!token && !isGuest) {
		throw new Error('Please log in or continue as guest to update cart');
	}

	try {
		await removeCartItem(token || null, { product_id: productId, size });
		// Reload cart from backend to get updated state
		await loadCart();
		return { success: true };
	} catch (err) {
		console.error('[cart] Failed to remove item:', err);
		throw err;
	}
}

// Clear cart
export async function clearCart() {
	const token = get(accessToken);
	const isGuest = hasGuestSession();

	if (!token && !isGuest) {
		cartItems.set([]);
		return { success: true };
	}

	try {
		await clearCartApi(token || null);
		// Reload cart from backend to ensure it's cleared
		await loadCart();
		return { success: true };
	} catch (err) {
		console.error('[cart] Failed to clear cart:', err);
		throw err;
	}
}

// Verify stock before checkout (no sync needed since quantities are always up-to-date)
export async function verifyStock() {
	const token = get(accessToken);
	console.log('[cart] verifyStock() called, token:', !!token);

	// Don't check for guest session here - let the API call proceed
	// Cookies are sent automatically with requests, so if guest session exists,
	// the backend will recognize it even if frontend hasn't detected the cookie yet

	try {
		// Quantities are already synced from increment/decrement calls
		// Pass null if no token (guests will use cookie/header automatically)
		console.log('[cart] 📡 Calling verifyCartStock API...');
		const result = await verifyCartStock(token || null);
		console.log('[cart] ✅ verifyCartStock API response:', result);
		return result;
	} catch (err) {
		console.error('[cart] ❌ Stock verification failed:', err);
		throw err;
	}
}
