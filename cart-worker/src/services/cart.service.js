import { parseJSON } from '../utils/json.util.js';
import { generateUUID } from '../utils/uuid.util.js';
import { getCached, setCached, invalidateCache } from './cache.service.js';
import {
	fetchProduct,
	fetchPrice,
	checkStock,
	checkFulfillment,
	deductStock,
	restoreStock,
	acquireLocks,
	releaseLocks,
} from './external-api.service.js';
import { logEvent, logError } from './log.service.js';
import {
	getOrCreateCart,
	findActiveCart,
	updateCartProducts,
	updateCartAddress,
	deleteCart,
	deleteActiveCartForUser,
	markCartAsConverted,
} from '../models/cart.model.js';
import { getCartIdentifier } from '../utils/cart.util.js';

// =============== 1️⃣ ADD PRODUCT TO CART ==================
export async function addProductToCart(c) {
	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Adding product to cart');
		}
		const { product_id, size, quantity } = await c.req.json();
		const cartInfo = getCartIdentifier(c);
		const { user_id, guest_session_id, cacheKey } = cartInfo;
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Product: ${product_id}, Size: ${size}, Quantity: ${quantity}`);
		}

		await logEvent(c.env, 'cart_add_attempt', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			product_id,
			size,
			quantity,
		});

		// Validation
		if (!product_id) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Validation failed: Missing product_id');
			}
			return c.json({ success: false, error: 'Missing product_id' }, 400);
		}
		if (!size) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Validation failed: Missing size');
			}
			return c.json({ success: false, error: 'Missing size' }, 400);
		}
		const qty = Number(quantity ?? 1);
		if (!Number.isFinite(qty) || qty <= 0) {
			return c.json({ success: false, error: 'Quantity must be a positive number' }, 400);
		}

		// Fetch product details from product-worker
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Fetching product details for: ${product_id}`);
		}
		const product = await fetchProduct(c, product_id);
		if (!product || !product.sku) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Product not found');
			}
			return c.json({ success: false, error: 'Product not found' }, 404);
		}

		// Fetch price from price-worker
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Fetching price for SKU: ${product.sku}`);
		}
		let priceData = null;
		try {
			priceData = await fetchPrice(c, product.sku, product_id);
		} catch (e) {
			await logError(c.env, 'price_fetch_failed', {
				user_id: user_id || null,
				guest_session_id: guest_session_id || null,
				product_id,
				sku: product.sku,
				message: e?.message ?? 'Unknown price error',
			});
			return c.json({ success: false, error: 'Price not found for product' }, 404);
		}

		// Get or create cart (supports both user and guest)
		console.log('[addProductToCart] Creating/getting cart:', {
			user_id,
			guest_session_id: guest_session_id ? guest_session_id.substring(0, 8) + '...' : null,
		});
		const cart = await getOrCreateCart(c.env.DB, user_id, guest_session_id);
		console.log('[addProductToCart] Cart result:', { cart_id: cart?.cart_id || null });
		const products = parseJSON(cart.products, []);

		// Check if product with same size already exists in cart
		const existingIndex = products.findIndex((p) => p.product_id === product_id && p.size === size);

		const productItem = {
			product_id: product_id,
			sku: product.sku,
			name: product.name || 'Unknown Product',
			image: product.primary_image_url || '',
			size: size,
			quantity: qty,
			price: priceData.price,
			currency: priceData.currency || 'INR',
		};

		if (existingIndex >= 0) {
			// Update existing item quantity
			products[existingIndex].quantity += qty;
		} else {
			// Add new item
			products.push(productItem);
		}

		// Update cart in database
		const productsJson = JSON.stringify(products);
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Updating cart: ${cart.cart_id}`);
		}
		await updateCartProducts(c.env.DB, cart.cart_id, productsJson);

		// Invalidate cache
		await invalidateCache(c, [cacheKey]);
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Product added to cart successfully');
		}

		await logEvent(c.env, 'cart_item_added', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			product_id,
			size,
			quantity: qty,
			cart_id: cart.cart_id,
		});

		return c.json({
			success: true,
			message: 'Product added to cart successfully',
			cart_id: cart.cart_id,
			product: productItem,
		});
	} catch (err) {
		const cartInfo = getCartIdentifier(c);
		await logError(c.env, 'cart_add_failed', {
			user_id: cartInfo.user_id || null,
			guest_session_id: cartInfo.guest_session_id || null,
			message: err?.message ?? 'Unknown error',
			stack: err?.stack ?? null,
		});
		return c.json(
			{
				success: false,
				error: err.message || 'Failed to add product to cart',
			},
			500,
		);
	}
}

// =============== 2️⃣ VIEW CART ==================
export async function viewCart(c) {
	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Fetching cart');
		}
		const cartInfo = getCartIdentifier(c);
		const { user_id, guest_session_id, cacheKey } = cartInfo;

		// Try cache first
		const cached = await getCached(c, cacheKey);
		if (cached) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Cart found in cache');
			}
			await logEvent(c.env, 'cart_view', {
				user_id: user_id || null,
				guest_session_id: guest_session_id || null,
				source: 'cache',
				item_count: cached.products?.length ?? 0,
			});
			return c.json({ success: true, cart: cached });
		}

		// Read-only: do not create a cart if none exists
		console.log('[viewCart] Looking up cart:', {
			user_id,
			guest_session_id: guest_session_id ? guest_session_id.substring(0, 8) + '...' : null,
		});
		const cart = await findActiveCart(c.env.DB, user_id, guest_session_id);
		console.log('[viewCart] Cart lookup result:', { found: !!cart, cart_id: cart?.cart_id || null });

		if (!cart) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Cart not found');
			}
			await logEvent(c.env, 'cart_view', {
				user_id: user_id || null,
				guest_session_id: guest_session_id || null,
				source: 'database',
				item_count: 0,
			});
			return c.json({ success: true, cart: null });
		}
		const products = parseJSON(cart.products, []);
		const address = cart.address ? parseJSON(cart.address, null) : null;

		// Calculate totals
		const subtotal = products.reduce((sum, item) => {
			return sum + item.price * item.quantity;
		}, 0);

		const payload = {
			cart_id: cart.cart_id,
			user_id: cart.user_id,
			products: products,
			address: address,
			subtotal: subtotal,
			item_count: products.length,
			status: cart.status,
			created_at: cart.created_at,
			updated_at: cart.updated_at,
		};

		// Cache for 3 minutes
		await setCached(c, cacheKey, payload, 180);
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Cart retrieved: ${products.length} item(s), Subtotal: ${subtotal}`);
		}

		await logEvent(c.env, 'cart_view', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			source: 'database',
			item_count: products.length,
		});

		return c.json({ success: true, cart: payload });
	} catch (err) {
		const cartInfo = getCartIdentifier(c);
		await logError(c.env, 'cart_view_failed', {
			user_id: cartInfo.user_id || null,
			guest_session_id: cartInfo.guest_session_id || null,
			message: err?.message ?? 'Unknown error',
			stack: err?.stack ?? null,
		});
		return c.json(
			{
				success: false,
				error: err.message || 'Failed to fetch cart',
			},
			500,
		);
	}
}

// =============== 3️⃣ VERIFY STOCK ==================
export async function verifyStock(c) {
	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Verifying stock for cart items');
		}
		const cartInfo = getCartIdentifier(c);
		const { user_id, guest_session_id, cacheKey } = cartInfo;

		await logEvent(c.env, 'cart_verify_stock_attempt', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
		});

		// Use same lookup strategy as viewCart - check cache first
		let cart = null;

		// Try cache first (same as viewCart)
		if (cacheKey) {
			const cached = await getCached(c, cacheKey);
			if (cached && cached.cart_id) {
				// Fetch the actual cart from DB using the cart_id from cache
				cart = await c.env.DB.prepare(
					`
          SELECT * FROM carts WHERE cart_id = ? AND status = 'active'
        `,
				)
					.bind(cached.cart_id)
					.first();
			}
		}

		// If not in cache, try direct DB lookup
		if (!cart) {
			cart = await findActiveCart(c.env.DB, user_id, guest_session_id);
		}

		console.log('[verifyStock] Cart lookup result:', {
			found: !!cart,
			cart_id: cart?.cart_id || null,
			has_products: !!cart?.products,
		});

		const products = cart ? parseJSON(cart.products, []) : [];
		console.log('[verifyStock] Products parsed:', {
			products_count: products.length,
			products: products.map((p) => ({ product_id: p.product_id, size: p.size, quantity: p.quantity })),
		});

		if (products.length === 0) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Cart is empty, no stock verification needed');
			}
			console.log('[verifyStock] WARNING: Products array is empty!');
			console.log('[verifyStock] Cart data:', {
				cart_id: cart?.cart_id || null,
				products_json: cart?.products || null,
				cart_user_id: cart?.user_id || null,
				cart_guest_session_id: cart?.guest_session_id ? cart.guest_session_id.substring(0, 12) + '...' : null,
			});
			return c.json({
				success: true,
				message: 'Cart is empty',
				errors: [],
			});
		}

		const errors = [];

		// Check stock for each product
		for (const item of products) {
			try {
				const res = await checkStock(c, item.product_id, item.size);
				console.log(`[verify-stock] response status for product=${item.product_id} size=${item.size}: ${res.status}`);

				if (!res.ok) {
					errors.push({
						product_id: item.product_id,
						sku: item.sku,
						name: item.name,
						size: item.size,
						requested: item.quantity,
						available: 0,
						message: 'Product not found in inventory',
					});
					continue;
				}

				const stockData = await res.json();
				console.log(`[verify-stock] stock payload keys: ${Object.keys(stockData || {}).join(',')}`);
				if (Array.isArray(stockData?.warehouses)) {
					console.log(`[verify-stock] warehouses count: ${stockData.warehouses.length}`);
				}

				if (!stockData.success) {
					errors.push({
						product_id: item.product_id,
						sku: item.sku,
						name: item.name,
						size: item.size,
						requested: item.quantity,
						available: 0,
						message: stockData.error || 'Stock check failed',
					});
					continue;
				}

				// Prefer fulfillment's computed total_stock for the requested size
				let totalAvailable = Number(stockData.total_stock ?? 0);
				if (!Number.isFinite(totalAvailable) || totalAvailable < 0) {
					// Fallback: calculate total available across warehouses for the requested size
					totalAvailable = (stockData.warehouses || []).reduce((sum, wh) => {
						let availableForSize = 0;
						if (typeof wh.quantity === 'number') {
							// Many APIs return per-size quantity as 'quantity'
							availableForSize = Number(wh.quantity) || 0;
						} else if (typeof wh.stock === 'number') {
							availableForSize = Number(wh.stock) || 0;
						} else if (wh && typeof wh.stock === 'object' && wh.stock !== null) {
							availableForSize = Number(wh.stock?.[item.size] || 0);
						} else if (wh && typeof wh.sizes === 'object' && wh.sizes !== null) {
							availableForSize = Number(wh.sizes?.[item.size] || 0);
						}
						return sum + availableForSize;
					}, 0);
				}
				console.log(`[verify-stock] available from fulfillment for product=${item.product_id} size=${item.size}: ${totalAvailable}`);

				if (totalAvailable < item.quantity) {
					errors.push({
						product_id: item.product_id,
						sku: item.sku,
						name: item.name,
						size: item.size,
						requested: item.quantity,
						available: totalAvailable,
						message: `Insufficient stock. Only ${totalAvailable} available.`,
					});
				}
			} catch (err) {
				errors.push({
					product_id: item.product_id,
					sku: item.sku,
					name: item.name,
					size: item.size,
					requested: item.quantity,
					available: 0,
					message: err.message || 'Failed to check stock',
				});
			}
		}

		await logEvent(c.env, 'cart_stock_verified', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			total_items: products.length,
			errors_count: errors.length,
		});

		if (errors.length > 0) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog(`Stock verification failed: ${errors.length} item(s) out of stock`);
			}
			return c.json(
				{
					success: false,
					message: 'Some items are out of stock or have insufficient quantity',
					errors: errors,
				},
				400,
			);
		}

		if (c.req.addTraceLog) {
			c.req.addTraceLog('All items verified in stock');
		}

		return c.json({
			success: true,
			message: 'All items are in stock',
			errors: [],
		});
	} catch (err) {
		const cartInfo = getCartIdentifier(c);
		await logError(c.env, 'cart_verify_stock_failed', {
			user_id: cartInfo.user_id || null,
			guest_session_id: cartInfo.guest_session_id || null,
			message: err?.message ?? 'Unknown error',
			stack: err?.stack ?? null,
		});
		return c.json(
			{
				success: false,
				error: err.message || 'Failed to verify stock',
			},
			500,
		);
	}
}

// =============== 3.1️⃣ SYNC CART ITEMS (persist frontend quantities) ==================
export async function syncCart(c) {
	try {
		const user_id = c.get('user_id');
		const { items } = await c.req.json();

		await logEvent(c.env, 'cart_sync_attempt', { user_id, items_count: Array.isArray(items) ? items.length : 0 });

		if (!Array.isArray(items)) {
			return c.json({ success: false, error: 'Invalid payload: items[] required' }, 400);
		}

		// If no items, do not create a cart; if a cart exists, clear it
		const existing = await findActiveCart(c.env.DB, user_id);
		if (!items.length) {
			if (existing) {
				await deleteCart(c.env.DB, existing.cart_id);
				await invalidateCache(c, [`cart:${user_id}`]);
				await logEvent(c.env, 'cart_deleted_on_empty_sync', { user_id });
			}
			return c.json({ success: true, cart_id: existing?.cart_id || null, items: [] });
		}

		// Ensure there is a cart to persist non-empty items
		const cart = existing || (await getOrCreateCart(c.env.DB, user_id));
		// Basic normalization and validation
		const normalized = items
			.filter(Boolean)
			.map((it) => ({
				product_id: String(it.product_id),
				sku: String(it.sku || ''),
				name: String(it.name || ''),
				image: String(it.image || ''),
				size: String(it.size),
				quantity: Math.max(1, Math.min(10, Number(it.quantity) || 1)),
				price: Number(it.price) || 0,
				currency: String(it.currency || 'INR'),
			}))
			.filter((it) => it.product_id && it.size); // require identifiers

		await updateCartProducts(c.env.DB, cart.cart_id, JSON.stringify(normalized));

		await invalidateCache(c, [`cart:${user_id}`]);
		await logEvent(c.env, 'cart_synced', { user_id, cart_id: cart.cart_id, items_count: normalized.length });

		return c.json({ success: true, cart_id: cart.cart_id, items: normalized });
	} catch (err) {
		await logError(c.env, 'cart_sync_failed', {
			user_id: c.get('user_id'),
			message: err?.message ?? 'Unknown error',
			stack: err?.stack ?? null,
		});
		return c.json(
			{
				success: false,
				error: err.message || 'Failed to sync cart',
			},
			500,
		);
	}
}

// =============== 3.1.5️⃣ INCREMENT QUANTITY ==================
export async function incrementQuantity(c) {
	try {
		const cartInfo = getCartIdentifier(c);
		const { user_id, guest_session_id, cacheKey } = cartInfo;
		const { product_id, size } = await c.req.json();

		console.log('[incrementQuantity] Request received:', {
			user_id: user_id || null,
			guest_session_id: guest_session_id ? guest_session_id.substring(0, 8) + '...' : null,
			product_id,
			size,
			hasCartInfo: !!cartInfo.identifier,
		});

		await logEvent(c.env, 'cart_increment_attempt', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			product_id,
			size,
		});

		if (!product_id || !size) {
			return c.json({ success: false, error: 'product_id and size required' }, 400);
		}

		// Debug: Check context values directly
		const user_id_from_context = c.get('user_id');
		const guest_session_id_from_context = c.get('guest_session_id');
		console.log('[incrementQuantity] Context values from c.get():', {
			user_id: user_id_from_context || null,
			guest_session_id: guest_session_id_from_context ? guest_session_id_from_context.substring(0, 12) + '...' : null,
		});

		if (!cartInfo.identifier) {
			console.log('[incrementQuantity] ERROR: No user_id or guest_session_id found in context');
			console.log('[incrementQuantity] cartInfo:', cartInfo);
			return c.json({ success: false, error: 'Authentication required. Please log in or continue as guest.' }, 401);
		}

		// Use the values from cartInfo (which come from context)
		console.log('[incrementQuantity] Looking up cart with:', {
			user_id: user_id || null,
			guest_session_id: guest_session_id ? guest_session_id.substring(0, 12) + '...' : null,
			identifier: cartInfo.identifier ? cartInfo.identifier.substring(0, 12) + '...' : null,
			cartInfo_type: cartInfo.type,
			cacheKey: cartInfo.cacheKey,
		});

		// IMPORTANT: Use the same lookup strategy as viewCart - check cache first, then DB
		// This ensures consistency between view and update operations
		let cart = null;

		// Try cache first (same as viewCart)
		if (cartInfo.cacheKey) {
			const cached = await getCached(c, cartInfo.cacheKey);
			if (cached && cached.cart_id) {
				console.log('[incrementQuantity] Found cart in cache, fetching from DB using cart_id:', cached.cart_id);
				// Fetch the actual cart from DB using the cart_id from cache
				cart = await c.env.DB.prepare(
					`
          SELECT * FROM carts WHERE cart_id = ? AND status = 'active'
        `,
				)
					.bind(cached.cart_id)
					.first();
				if (cart) {
					console.log('[incrementQuantity] Successfully retrieved cart from DB using cached cart_id');
				}
			}
		}

		// If not in cache, try direct DB lookup (same as viewCart)
		if (!cart) {
			console.log('[incrementQuantity] Cart not in cache, trying direct DB lookup...');
			cart = await findActiveCart(c.env.DB, user_id, guest_session_id);
		}
		console.log('[incrementQuantity] Cart lookup result:', {
			found: !!cart,
			cart_id: cart?.cart_id || null,
			products_count: cart?.products ? JSON.parse(cart.products).length : 0,
			cart_user_id: cart?.user_id || null,
			cart_guest_session_id: cart?.guest_session_id ? cart.guest_session_id.substring(0, 12) + '...' : null,
		});

		if (!cart) {
			console.log('[incrementQuantity] ERROR: Cart not found.');
			console.log('[incrementQuantity] Searched with:', {
				user_id: user_id || null,
				guest_session_id: guest_session_id || null,
			});
			console.log('[incrementQuantity] This might mean:');
			console.log('[incrementQuantity] - No cart exists yet for this guest/user');
			console.log("[incrementQuantity] - The guest_session_id/user_id doesn't match any cart in DB");
			console.log('[incrementQuantity] - There might be a mismatch between the session ID in cookie and DB');
			return c.json(
				{
					success: false,
					error: 'Cart not found. Please add items to your cart first.',
				},
				404,
			);
		}

		const products = parseJSON(cart.products, []);
		console.log(
			'[incrementQuantity] Cart products:',
			products.map((p) => ({
				product_id: String(p.product_id),
				size: String(p.size),
				quantity: p.quantity,
			})),
		);
		console.log('[incrementQuantity] Looking for:', {
			product_id: String(product_id),
			size: String(size),
		});

		const itemIndex = products.findIndex((p) => {
			const productMatch = String(p.product_id) === String(product_id);
			const sizeMatch = String(p.size) === String(size);
			return productMatch && sizeMatch;
		});

		console.log('[incrementQuantity] Item search result:', {
			itemIndex,
			found: itemIndex >= 0,
			products_count: products.length,
		});

		if (itemIndex < 0) {
			console.log('[incrementQuantity] ERROR: Item not found in cart');
			console.log(
				'[incrementQuantity] Available items:',
				products.map((p) => ({
					id: String(p.product_id),
					size: String(p.size),
				})),
			);
			return c.json(
				{
					success: false,
					error: `Item not found in cart. Looking for product_id=${product_id}, size=${size}. Cart has ${products.length} item(s).`,
				},
				404,
			);
		}

		// Increment quantity (max 10)
		const currentQty = Number(products[itemIndex].quantity) || 1;
		if (currentQty >= 10) {
			return c.json({ success: false, error: 'Maximum quantity is 10' }, 400);
		}

		products[itemIndex].quantity = currentQty + 1;
		await updateCartProducts(c.env.DB, cart.cart_id, JSON.stringify(products));

		if (cacheKey) {
			await invalidateCache(c, [cacheKey]);
		}
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Quantity incremented: ${products[itemIndex].quantity}`);
		}
		await logEvent(c.env, 'cart_quantity_incremented', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			cart_id: cart.cart_id,
			product_id,
			size,
			new_quantity: products[itemIndex].quantity,
		});

		return c.json({
			success: true,
			cart_id: cart.cart_id,
			quantity: products[itemIndex].quantity,
		});
	} catch (err) {
		const cartInfo = getCartIdentifier(c);
		await logError(c.env, 'cart_increment_failed', {
			user_id: cartInfo.user_id || null,
			guest_session_id: cartInfo.guest_session_id || null,
			message: err?.message ?? 'Unknown error',
			stack: err?.stack ?? null,
		});
		return c.json({ success: false, error: err.message || 'Failed to increment quantity' }, 500);
	}
}

// =============== 3.1.6️⃣ DECREMENT QUANTITY ==================
export async function decrementQuantity(c) {
	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Decrementing cart item quantity');
		}
		const cartInfo = getCartIdentifier(c);
		const { user_id, guest_session_id, cacheKey } = cartInfo;
		const { product_id, size } = await c.req.json();
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Product: ${product_id}, Size: ${size}`);
		}

		await logEvent(c.env, 'cart_decrement_attempt', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			product_id,
			size,
		});

		if (!product_id || !size) {
			return c.json({ success: false, error: 'product_id and size required' }, 400);
		}

		const cart = await findActiveCart(c.env.DB, user_id, guest_session_id);
		if (!cart) {
			return c.json({ success: false, error: 'Cart not found' }, 404);
		}

		const products = parseJSON(cart.products, []);
		const itemIndex = products.findIndex((p) => p.product_id === product_id && String(p.size) === String(size));

		if (itemIndex < 0) {
			return c.json({ success: false, error: 'Item not found in cart' }, 404);
		}

		// Decrement quantity (min 1, if 1 then remove item)
		const currentQty = Number(products[itemIndex].quantity) || 1;
		if (currentQty <= 1) {
			// Remove item if quantity would be 0
			products.splice(itemIndex, 1);
		} else {
			products[itemIndex].quantity = currentQty - 1;
		}

		// Update or clear cart
		if (products.length === 0) {
			await deleteCart(c.env.DB, cart.cart_id);
			if (cacheKey) {
				await invalidateCache(c, [cacheKey]);
			}
			await logEvent(c.env, 'cart_item_removed_on_decrement', {
				user_id: user_id || null,
				guest_session_id: guest_session_id || null,
				cart_id: cart.cart_id,
				product_id,
				size,
			});
			return c.json({ success: true, cart_id: null, item_count: 0, removed: true });
		} else {
			await updateCartProducts(c.env.DB, cart.cart_id, JSON.stringify(products));
			if (cacheKey) {
				await invalidateCache(c, [cacheKey]);
			}
			if (c.req.addTraceLog) {
				c.req.addTraceLog(`Quantity decremented: ${products[itemIndex]?.quantity || 0}`);
			}
			await logEvent(c.env, 'cart_quantity_decremented', {
				user_id: user_id || null,
				guest_session_id: guest_session_id || null,
				cart_id: cart.cart_id,
				product_id,
				size,
				new_quantity: products[itemIndex]?.quantity || 0,
			});
			return c.json({
				success: true,
				cart_id: cart.cart_id,
				quantity: products[itemIndex]?.quantity || 0,
				removed: false,
			});
		}
	} catch (err) {
		const cartInfo = getCartIdentifier(c);
		await logError(c.env, 'cart_decrement_failed', {
			user_id: cartInfo.user_id || null,
			guest_session_id: cartInfo.guest_session_id || null,
			message: err?.message ?? 'Unknown error',
			stack: err?.stack ?? null,
		});
		return c.json({ success: false, error: err.message || 'Failed to decrement quantity' }, 500);
	}
}

// =============== 3.2️⃣ REMOVE ONE ITEM ==================
export async function removeCartItem(c) {
	try {
		const cartInfo = getCartIdentifier(c);
		const { user_id, guest_session_id, cacheKey } = cartInfo;
		const { product_id, size } = await c.req.json();

		await logEvent(c.env, 'cart_remove_item_attempt', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			product_id,
			size,
		});

		if (!product_id || !size) {
			return c.json({ success: false, error: 'product_id and size required' }, 400);
		}

		const cart = await findActiveCart(c.env.DB, user_id, guest_session_id);
		if (!cart) {
			// Nothing to remove
			await logEvent(c.env, 'cart_item_remove_noop', {
				user_id: user_id || null,
				guest_session_id: guest_session_id || null,
			});
			return c.json({ success: true, message: 'Cart not found or already empty', cart_id: null, item_count: 0 });
		}
		const products = parseJSON(cart.products, []);
		const next = products.filter((p) => !(p.product_id === product_id && String(p.size) === String(size)));

		// If no items left, delete the cart; otherwise update it
		if (next.length === 0) {
			await deleteCart(c.env.DB, cart.cart_id);
			if (cacheKey) {
				await invalidateCache(c, [cacheKey]);
			}
			await logEvent(c.env, 'cart_item_removed_cart_deleted', {
				user_id: user_id || null,
				guest_session_id: guest_session_id || null,
				cart_id: cart.cart_id,
				remaining: 0,
			});
			return c.json({
				success: true,
				message: 'Item removed. Cart is now empty.',
				cart_id: null,
				item_count: 0,
			});
		} else {
			await updateCartProducts(c.env.DB, cart.cart_id, JSON.stringify(next));
			if (cacheKey) {
				await invalidateCache(c, [cacheKey]);
			}
			await logEvent(c.env, 'cart_item_removed', {
				user_id: user_id || null,
				guest_session_id: guest_session_id || null,
				cart_id: cart.cart_id,
				remaining: next.length,
			});
			return c.json({
				success: true,
				message: 'Item removed successfully',
				cart_id: cart.cart_id,
				item_count: next.length,
			});
		}
	} catch (err) {
		const cartInfo = getCartIdentifier(c);
		await logError(c.env, 'cart_remove_item_failed', {
			user_id: cartInfo.user_id || null,
			guest_session_id: cartInfo.guest_session_id || null,
			message: err?.message ?? 'Unknown error',
			stack: err?.stack ?? null,
		});
		return c.json({ success: false, error: err.message || 'Failed to remove item' }, 500);
	}
}

// =============== 3.3️⃣ CLEAR CART ==================
export async function clearCart(c) {
	try {
		const cartInfo = getCartIdentifier(c);
		const { user_id, guest_session_id, cacheKey } = cartInfo;

		await logEvent(c.env, 'cart_clear_attempt', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
		});

		// Delete active cart row entirely so a fresh one is created later
		await deleteActiveCartForUser(c.env.DB, user_id, guest_session_id);

		if (cacheKey) {
			await invalidateCache(c, [cacheKey]);
		}
		await logEvent(c.env, 'cart_cleared', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
		});

		return c.json({ success: true });
	} catch (err) {
		const cartInfo = getCartIdentifier(c);
		await logError(c.env, 'cart_clear_failed', {
			user_id: cartInfo.user_id || null,
			guest_session_id: cartInfo.guest_session_id || null,
			message: err?.message ?? 'Unknown error',
			stack: err?.stack ?? null,
		});
		return c.json({ success: false, error: err.message || 'Failed to clear cart' }, 500);
	}
}

// =============== 4️⃣ SAVE SHIPPING ADDRESS ==================
export async function saveShippingAddress(c) {
	try {
		const cartInfo = getCartIdentifier(c);
		const { user_id, guest_session_id, cacheKey } = cartInfo;
		const { line1, line2, city, state, postal_code, country } = await c.req.json();

		await logEvent(c.env, 'cart_shipping_save_attempt', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
		});

		// Validation
		if (!line1 || !city || !state || !postal_code || !country) {
			return c.json({ success: false, error: 'Missing required address fields' }, 400);
		}

		// Get or create cart (supports both user and guest)
		const cart = await getOrCreateCart(c.env.DB, user_id, guest_session_id);

		// Build address JSON
		const address = {
			type: 'shipping',
			line1,
			line2: line2 || '',
			city,
			state,
			postal_code,
			country,
		};

		// Update cart with address
		const addressJson = JSON.stringify(address);
		await updateCartAddress(c.env.DB, cart.cart_id, addressJson);

		// Invalidate cache
		if (cacheKey) {
			await invalidateCache(c, [cacheKey]);
		}

		await logEvent(c.env, 'cart_shipping_saved', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			cart_id: cart.cart_id,
		});

		return c.json({
			success: true,
			message: 'Shipping address saved to cart',
			address,
		});
	} catch (err) {
		const cartInfo = getCartIdentifier(c);
		await logError(c.env, 'cart_shipping_save_failed', {
			user_id: cartInfo.user_id || null,
			guest_session_id: cartInfo.guest_session_id || null,
			message: err?.message ?? 'Unknown error',
			stack: err?.stack ?? null,
		});
		return c.json(
			{
				success: false,
				error: err.message || 'Failed to save shipping address',
			},
			500,
		);
	}
}

// =============== 5️⃣ ORDER SUMMARY (Cart + Delivery Estimates) ==================
export async function getCartSummary(c) {
	try {
		const cartInfo = getCartIdentifier(c);
		const { user_id, guest_session_id, cacheKey } = cartInfo;

		console.log(
			`[cart-summary] START for user_id=${user_id || null}, guest_session_id=${guest_session_id ? guest_session_id.substring(0, 8) + '...' : null}`,
		);
		await logEvent(c.env, 'cart_summary_request', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
		});

		// Use same lookup strategy as viewCart - check cache first
		let cart = null;

		// Try cache first (same as viewCart)
		if (cacheKey) {
			const cached = await getCached(c, cacheKey);
			if (cached && cached.cart_id) {
				// Fetch the actual cart from DB using the cart_id from cache
				cart = await c.env.DB.prepare(
					`
          SELECT * FROM carts WHERE cart_id = ? AND status = 'active'
        `,
				)
					.bind(cached.cart_id)
					.first();
			}
		}

		// If not in cache, try direct DB lookup
		if (!cart) {
			cart = await findActiveCart(c.env.DB, user_id, guest_session_id);
		}

		if (!cart) {
			return c.json({ success: false, error: 'Cart is empty' }, 400);
		}
		const products = parseJSON(cart.products, []);
		const address = cart.address ? parseJSON(cart.address, null) : null;

		console.log(`[cart-summary] Cart loaded: cart_id=${cart.cart_id}, products=${products.length}`);
		console.log(`[cart-summary] Address: ${address ? `postal_code=${address.postal_code}, city=${address.city}` : 'NOT SET'}`);

		if (products.length === 0) {
			console.log(`[cart-summary] ERROR: Cart is empty`);
			return c.json(
				{
					success: false,
					error: 'Cart is empty',
				},
				400,
			);
		}

		if (!address || !address.postal_code) {
			console.log(`[cart-summary] ERROR: No shipping address`);
			return c.json(
				{
					success: false,
					error: 'Shipping address not set. Please provide shipping address first.',
				},
				400,
			);
		}

		// Calculate subtotal
		const subtotal = products.reduce((sum, item) => sum + item.price * item.quantity, 0);
		console.log(`[cart-summary] Subtotal calculated: ₹${subtotal}`);

		// Call fulfillment for each product to get delivery estimates
		console.log(`[cart-summary] Starting fulfillment checks for ${products.length} products`);
		const deliveryEstimates = [];
		let highestTier = null;
		const tierOrder = ['tier_3', 'tier_2', 'tier_1'];

		for (const item of products) {
			try {
				console.log(
					`[cart-summary] Checking fulfillment for product_id=${item.product_id}, sku=${item.sku}, size=${item.size}, qty=${item.quantity}`,
				);

				const payload = {
					postal_code: address.postal_code,
					product_id: item.product_id,
					size: item.size,
					quantity: item.quantity,
				};

				const res = await checkFulfillment(c, payload);

				console.log(`[cart-summary] Fulfillment response status for ${item.sku}: ${res.status}`);

				if (res.ok) {
					const fulfillmentData = await res.json();
					console.log(
						`[cart-summary] Fulfillment data for ${item.sku}: success=${fulfillmentData.success}, tier=${fulfillmentData.delivery?.highest_tier}`,
					);

					if (fulfillmentData.success && fulfillmentData.delivery) {
						deliveryEstimates.push({
							product_id: item.product_id,
							name: item.name,
							tier: fulfillmentData.delivery.highest_tier,
							...fulfillmentData.delivery,
						});

						// Track highest tier across all items
						const itemTier = fulfillmentData.delivery.highest_tier;
						console.log(`[cart-summary] Product ${item.sku} tier: ${itemTier}, current highest: ${highestTier || 'none'}`);

						if (!highestTier || tierOrder.indexOf(itemTier) < tierOrder.indexOf(highestTier)) {
							highestTier = itemTier;
							console.log(`[cart-summary] New highest tier: ${highestTier}`);
						}
					} else {
						console.log(`[cart-summary] Fulfillment failed for ${item.sku}: ${fulfillmentData.error || 'Unknown error'}`);
					}
				} else {
					console.log(`[cart-summary] Fulfillment HTTP error for ${item.sku}: ${res.status}`);
				}
			} catch (err) {
				console.error(`[cart-summary] Fulfillment check exception for product ${item.product_id}:`, err);
			}
		}

		console.log(
			`[cart-summary] All fulfillment checks complete. Estimates count: ${deliveryEstimates.length}, highest tier: ${highestTier}`,
		);

		// Track which products failed allocation
		const failedProducts = [];
		const successfulProducts = [];

		for (const item of products) {
			const hasEstimate = deliveryEstimates.some((e) => e.product_id === item.product_id);
			if (hasEstimate) {
				successfulProducts.push(item);
			} else {
				failedProducts.push({
					product_id: item.product_id,
					name: item.name,
					sku: item.sku,
					size: item.size,
					quantity: item.quantity,
				});
			}
		}

		console.log(`[cart-summary] Allocation results: ${successfulProducts.length} successful, ${failedProducts.length} failed`);

		// Determine if all products are deliverable
		const allDeliverable = failedProducts.length === 0;

		// Use the highest tier's delivery costs only if all products are deliverable
		const primaryEstimate =
			allDeliverable && deliveryEstimates.length > 0 ? deliveryEstimates.find((e) => e.tier === highestTier) || deliveryEstimates[0] : null;

		console.log(`[cart-summary] Using primary estimate from tier: ${primaryEstimate?.tier || 'NONE (allocation failures)'}`);

		const summary = {
			cart_id: cart.cart_id,
			user_id: cart.user_id,
			products,
			address,
			subtotal,
			item_count: products.length,
			delivery: primaryEstimate
				? {
						tier: highestTier,
						tier_description: primaryEstimate.tier_description,
						standard_delivery_cost: primaryEstimate.standard_delivery_cost,
						express_delivery_cost: primaryEstimate.express_delivery_cost,
						express_available: primaryEstimate.express_available,
						estimated_days_normal: primaryEstimate.estimated_days_normal,
						estimated_days_express: primaryEstimate.estimated_days_express,
						estimated_delivery_date_normal: primaryEstimate.estimated_delivery_date_normal,
						estimated_delivery_date_express: primaryEstimate.estimated_delivery_date_express,
						currency: primaryEstimate.currency || 'INR',
					}
				: null,
			deliverable: allDeliverable,
			allocation_errors: failedProducts.length > 0 ? failedProducts : null,
			status: cart.status,
			created_at: cart.created_at,
			updated_at: cart.updated_at,
		};

		// If any products failed allocation, return success=false but include summary
		if (!allDeliverable) {
			console.log(`[cart-summary] WARNING: ${failedProducts.length} products cannot be allocated to postal code ${address.postal_code}`);
			return c.json(
				{
					success: false,
					error:
						failedProducts.length === products.length
							? 'Products are not deliverable to this location'
							: 'Some products cannot be allocated to this location',
					summary,
				},
				400,
			);
		}

		await logEvent(c.env, 'cart_summary_retrieved', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			item_count: products.length,
		});

		console.log(`[cart-summary] SUCCESS: Returning summary with ${products.length} products, delivery tier: ${highestTier}`);
		return c.json({ success: true, summary });
	} catch (err) {
		const cartInfo = getCartIdentifier(c);
		await logError(c.env, 'cart_summary_failed', {
			user_id: cartInfo.user_id || null,
			guest_session_id: cartInfo.guest_session_id || null,
			message: err?.message ?? 'Unknown error',
			stack: err?.stack ?? null,
		});
		return c.json(
			{
				success: false,
				error: err.message || 'Failed to get order summary',
			},
			500,
		);
	}
}

// =============== 6️⃣ PLACE ORDER (Verify again → Create order) ==================
export async function placeOrder(c) {
	// Variables for lock management (needed in catch block)
	let locksAcquired = false;
	let acquiredLockAllocations = [];
	let user_id = null;
	let guest_session_id = null;

	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Starting order placement');
		}
		const cartInfo = getCartIdentifier(c);
		user_id = cartInfo.user_id;
		guest_session_id = cartInfo.guest_session_id;
		const { cacheKey } = cartInfo;
		const { delivery_mode, payment_status } = await c.req.json().catch(() => ({}));
		const mode = delivery_mode === 'express' ? 'express' : 'standard';
		// payment_status can be 'paid' (for PayPal) or 'pending' (for COD), default to 'pending'
		const payStatus = payment_status === 'paid' ? 'paid' : 'pending';
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Order mode: ${mode}, Payment status: ${payStatus}`);
		}

		await logEvent(c.env, 'place_order_attempt', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			delivery_mode: mode,
		});

		// Use same lookup strategy as viewCart - check cache first
		let cart = null;

		// Try cache first (same as viewCart)
		if (cacheKey) {
			const cached = await getCached(c, cacheKey);
			if (cached && cached.cart_id) {
				// Fetch the actual cart from DB using the cart_id from cache
				cart = await c.env.DB.prepare(
					`
          SELECT * FROM carts WHERE cart_id = ? AND status = 'active'
        `,
				)
					.bind(cached.cart_id)
					.first();
			}
		}

		// If not in cache, try direct DB lookup or get/create
		if (!cart) {
			cart = await getOrCreateCart(c.env.DB, user_id, guest_session_id);
		}

		const products = parseJSON(cart.products, []);
		const address = cart.address ? parseJSON(cart.address, null) : null;

		if (!products.length) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Order placement failed: Cart is empty');
			}
			return c.json({ success: false, error: 'Cart is empty' }, 400);
		}
		if (!address?.postal_code) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Order placement failed: Shipping address not set');
			}
			return c.json({ success: false, error: 'Shipping address not set' }, 400);
		}

		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Verifying stock and allocations for ${products.length} item(s)`);
		}

		// 1) Re-verify stock and fetch allocations for each item
		const verifiedItems = [];
		for (const item of products) {
			const payload = {
				postal_code: address.postal_code,
				product_id: item.product_id,
				size: item.size,
				quantity: item.quantity,
			};

			const res = await checkFulfillment(c, payload);

			if (!res.ok) {
				return c.json({ success: false, error: `Fulfillment check failed (${res.status})` }, 409);
			}

			const data = await res.json();
			if (!data.success || !data.fulfillment) {
				return c.json({ success: false, error: data.error || 'Item out of stock' }, 409);
			}

			const itemTier = data.delivery?.highest_tier || 'tier_1';
			console.log(`[place-order] Item ${item.sku} tier from fulfillment: ${itemTier}`);
			verifiedItems.push({
				...item,
				fulfillment: data.fulfillment,
				delivery: data.delivery,
			});
		}

		// 2) Totals
		const subtotal = verifiedItems.reduce((s, it) => s + it.price * it.quantity, 0);
		const primaryDelivery = verifiedItems[0]?.delivery;
		const deliveryCost = primaryDelivery
			? mode === 'express'
				? Number(primaryDelivery.express_delivery_cost || 0)
				: Number(primaryDelivery.standard_delivery_cost || 0)
			: 0;
		const tax = Number((subtotal * 0.1).toFixed(2));
		const total = Number((subtotal + deliveryCost + tax).toFixed(2));
		// Find the highest tier (tier_3 is highest, tier_1 is lowest)
		// tier_3 = farthest distance, tier_1 = closest distance
		const highestTier =
			verifiedItems.reduce((acc, it) => {
				const tierOrder = ['tier_3', 'tier_2', 'tier_1']; // tier_3 has index 0 (highest), tier_1 has index 2 (lowest)
				const t = it.delivery?.highest_tier || 'tier_1';
				if (!acc) return t;
				// Return the tier with the smaller index (tier_3=0 < tier_2=1 < tier_1=2)
				// This gives us the HIGHEST tier
				const tIndex = tierOrder.indexOf(t);
				const accIndex = tierOrder.indexOf(acc);
				return tIndex < accIndex ? t : acc;
			}, null) || 'tier_1';

		console.log(`[place-order] Calculated highest tier: ${highestTier} from ${verifiedItems.length} items`);

		const estimatedDeliveryDate = primaryDelivery
			? mode === 'express'
				? primaryDelivery.estimated_delivery_date_express
				: primaryDelivery.estimated_delivery_date_normal
			: null;

		// 3) Acquire locks BEFORE order creation to prevent race conditions
		const allAllocations = [];
		for (const item of verifiedItems) {
			const allocations = item.fulfillment?.allocations || [];
			for (const allocation of allocations) {
				// Build SKU ID in format "SKU-size" (e.g., "P0003-11")
				// allocation.sku is the SKU code (e.g., "P0003"), we append size to it
				const skuId = allocation.sku || item.sku;
				allAllocations.push({
					warehouse_id: allocation.warehouse_id,
					sku: skuId, // SKU ID format: "P0003-11" (SKU code + size)
					allocated_quantity: allocation.allocated_quantity,
				});
			}
		}

		if (allAllocations.length > 0) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog(`Acquiring inventory locks for ${allAllocations.length} allocation(s)`);
			}
			console.log(`[place-order] 🔒 Acquiring locks for ${allAllocations.length} allocations`);
			const lockRes = await acquireLocks(c, allAllocations, user_id, guest_session_id);
			const lockResult = await lockRes.json().catch(() => ({}));

			if (!lockRes.ok || !lockResult?.success) {
				if (c.req.addTraceLog) {
					c.req.addTraceLog('Failed to acquire inventory locks');
				}
				console.error(`[place-order] ❌ Failed to acquire locks:`, lockResult);
				return c.json(
					{
						success: false,
						error: lockResult?.error || 'Failed to acquire inventory locks. Please try again.',
					},
					500,
				);
			}

			locksAcquired = true;
			acquiredLockAllocations = allAllocations;
			if (c.req.addTraceLog) {
				c.req.addTraceLog(`Successfully acquired ${lockResult.locked || 0} inventory lock(s)`);
			}
			console.log(`[place-order] ✅ Successfully acquired ${lockResult.locked || 0} locks`);
		}

		// 4) Create order via orders-worker (internal)
		const order_id = `ord_${generateUUID().substring(0, 12)}`;
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Creating order: ${order_id}, Total: ${total}`);
		}
		const orderPayload = {
			order_id,
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			products: JSON.stringify(verifiedItems),
			address: JSON.stringify(address),
			delivery_mode: mode,
			delivery_tier: highestTier,
			subtotal: Number(subtotal.toFixed(2)),
			delivery_cost: Number(deliveryCost.toFixed(2)),
			tax,
			total,
			status: 'pending',
			payment_status: payStatus,
			estimated_delivery_date: estimatedDeliveryDate,
		};

		let createRes;
		if (c.env.ORDER_SERVICE) {
			const req = new Request('https://internal/internal/orders/create', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(orderPayload),
			});
			createRes = await c.env.ORDER_SERVICE.fetch(req);
		} else {
			// Release locks if ORDER_SERVICE binding missing
			if (locksAcquired && acquiredLockAllocations.length > 0) {
				console.log(`[place-order] 🔓 Releasing locks due to missing ORDER_SERVICE binding`);
				try {
					await releaseLocks(c, acquiredLockAllocations, user_id, guest_session_id);
				} catch (releaseErr) {
					console.error(`[place-order] Failed to release locks on error:`, releaseErr);
				}
			}
			return c.json({ success: false, error: 'ORDER_SERVICE binding missing' }, 500);
		}

		if (!createRes.ok) {
			// Release locks if order creation failed
			if (locksAcquired && acquiredLockAllocations.length > 0) {
				console.log(`[place-order] 🔓 Releasing locks due to order creation failure`);
				try {
					await releaseLocks(c, acquiredLockAllocations, user_id, guest_session_id);
				} catch (releaseErr) {
					console.error(`[place-order] Failed to release locks on error:`, releaseErr);
				}
			}

			const txt = await createRes.text().catch(() => '');
			return c.json({ success: false, error: `Order create failed (${createRes.status}) ${txt}` }, 500);
		}
		const created = await createRes.json().catch(() => ({}));
		if (!created?.success) {
			// Release locks if order creation failed
			if (locksAcquired && acquiredLockAllocations.length > 0) {
				console.log(`[place-order] 🔓 Releasing locks due to order creation failure`);
				try {
					await releaseLocks(c, acquiredLockAllocations, user_id, guest_session_id);
				} catch (releaseErr) {
					console.error(`[place-order] Failed to release locks on error:`, releaseErr);
				}
			}

			return c.json({ success: false, error: created?.error || 'Order create failed' }, 500);
		}

		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Order created successfully: ${order_id}`);
		}

		// 5) Deduct stock per allocation (atomic with rollback on failure)
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Deducting stock from warehouses');
		}
		const successfulDeductions = [];
		for (const item of verifiedItems) {
			const allocations = item.fulfillment?.allocations || [];
			for (const allocation of allocations) {
				try {
					const deductPayload = {
						warehouse_id: allocation.warehouse_id,
						product_id: item.product_id,
						size: item.size,
						quantity: allocation.allocated_quantity,
					};
					const res = await deductStock(c, deductPayload);
					const result = await res.json().catch(() => ({}));
					if (!res.ok || !result?.success) {
						// Release locks if they were acquired
						if (locksAcquired && acquiredLockAllocations.length > 0) {
							console.log(`[place-order] 🔓 Releasing locks due to stock deduction failure`);
							try {
								await releaseLocks(c, acquiredLockAllocations, user_id, guest_session_id);
							} catch (releaseErr) {
								console.error(`[place-order] Failed to release locks on error:`, releaseErr);
							}
						}

						// Rollback all prior deductions
						for (const d of successfulDeductions.reverse()) {
							try {
								const r = await restoreStock(c, d);
								await r.text().catch(() => {});
							} catch {
								// Ignore rollback errors
							}
						}
						return c.json({ success: false, error: result?.error || 'Stock deduction failed' }, 409);
					}
					successfulDeductions.push(deductPayload);
				} catch (err) {
					// Release locks if they were acquired
					if (locksAcquired && acquiredLockAllocations.length > 0) {
						console.log(`[place-order] 🔓 Releasing locks due to exception`);
						try {
							await releaseLocks(c, acquiredLockAllocations, user_id, guest_session_id);
						} catch (releaseErr) {
							console.error(`[place-order] Failed to release locks on error:`, releaseErr);
						}
					}

					// Rollback all prior deductions
					for (const d of successfulDeductions.reverse()) {
						try {
							const r = await restoreStock(c, d);
							await r.text().catch(() => {});
						} catch {
							// Ignore rollback errors
						}
					}
					return c.json({ success: false, error: err.message || 'Stock deduction failed' }, 409);
				}
			}
		}

		// 6) Release locks AFTER successful stock deduction (locks served their purpose)
		if (locksAcquired && acquiredLockAllocations.length > 0) {
			console.log(`[place-order] 🔓 Releasing locks after successful stock deduction`);
			try {
				const releaseRes = await releaseLocks(c, acquiredLockAllocations, user_id, guest_session_id);
				const releaseResult = await releaseRes.json().catch(() => ({}));
				if (releaseRes.ok && releaseResult?.success) {
					console.log(`[place-order] ✅ Successfully released ${releaseResult.released || 0} locks`);
				} else {
					console.error(`[place-order] ⚠️ Failed to release locks (non-critical):`, releaseResult);
				}
			} catch (releaseErr) {
				console.error(`[place-order] ⚠️ Exception releasing locks (non-critical):`, releaseErr);
			}
		}

		// 7) Mark cart as converted after successful deductions
		await markCartAsConverted(c.env.DB, cart.cart_id);
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Order placed successfully: ${order_id}, Total: ${total}`);
		}

		// Invalidate cache using cacheKey
		const keysToInvalidate = [];
		if (cacheKey) {
			keysToInvalidate.push(cacheKey);
		}
		// Also invalidate orders cache if user_id exists
		if (user_id) {
			keysToInvalidate.push(`orders:${user_id}`);
		}
		if (keysToInvalidate.length > 0) {
			await invalidateCache(c, keysToInvalidate);
		}

		await logEvent(c.env, 'place_order_success', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			order_id,
			total,
			delivery_mode: mode,
		});
		return c.json({
			success: true,
			order: {
				order_id,
				total,
				delivery_mode: mode,
				delivery_tier: highestTier,
				estimated_delivery_date: estimatedDeliveryDate,
			},
		});
	} catch (err) {
		// Release locks if they were acquired and an error occurred
		if (locksAcquired && acquiredLockAllocations.length > 0) {
			console.log(`[place-order] 🔓 Releasing locks due to exception in catch block`);
			try {
				await releaseLocks(c, acquiredLockAllocations, user_id, guest_session_id);
			} catch (releaseErr) {
				console.error(`[place-order] Failed to release locks on error:`, releaseErr);
			}
		}

		await logError(c.env, 'place_order_failed', {
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			message: err?.message ?? 'Unknown error',
			stack: err?.stack ?? null,
		});
		return c.json({ success: false, error: err.message || 'Failed to place order' }, 500);
	}
}
