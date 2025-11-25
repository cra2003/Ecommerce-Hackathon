import { insertOrderLegacy, insertOrderItem } from '../services/order.service.js';
import { getCartByUser, getCartItemsWithProducts, deleteCartItems } from '../services/cart.service.js';
import { reduceProductStock } from '../services/product.service.js';
import { invalidateCache } from '../services/cache.service.js';
import { logEvent, logError } from '../services/log.service.js';

// ================= 1️⃣ PLACE ORDER =================
export async function createOrderHandler(c) {
	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Placing order (legacy flow)');
		}
		const user_id = c.get('user_id');
		const { address, delivery_mode } = await c.req.json();
		if (!address) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Validation failed: Address required');
			}
			return c.json({ error: 'Address required' }, 400);
		}
		await logEvent(c.env, 'order_place_attempt', { user_id, delivery_mode: delivery_mode || 'Normal' });

		// 1️⃣ Get user cart
		const cart = await getCartByUser(c.env.DB, user_id);
		if (!cart) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('No active cart found');
			}
			return c.json({ error: 'No active cart found' }, 404);
		}

		const items = await getCartItemsWithProducts(c.env.DB, cart.cart_id);

		if (items.results.length === 0) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Cart is empty');
			}
			return c.json({ error: 'Cart is empty' }, 400);
		}

		// 2️⃣ Calculate total
		const total = items.results.reduce((sum, i) => sum + i.price * i.quantity, 0);

		// 3️⃣ Create new order
		const orderId = await insertOrderLegacy(c.env.DB, user_id, total, address, delivery_mode);
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Order created: ${orderId}, Total: ${total}`);
		}
		console.log('🛒 Order created:', orderId);
		// 4️⃣ Add order items + reduce stock
		for (const item of items.results) {
			console.log('🛒 Adding order item:', item.product_id, item.quantity, item.price);
			await insertOrderItem(c.env.DB, orderId, item.product_id, item.quantity, item.price);

			await reduceProductStock(c.env.DB, item.product_id, item.quantity);
		}

		// 5️⃣ Clear cart
		await deleteCartItems(c.env.DB, cart.cart_id);

		// Invalidate caches: user's orders and cart views (shared KV)
		await invalidateCache(c, [`orders:${user_id}`, `cart:${user_id}`]);
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Order placed successfully: ${orderId}`);
		}

		await logEvent(c.env, 'order_placed', { user_id, order_id: orderId, total, delivery_mode: delivery_mode || 'Normal' });
		return c.json({
			message: 'Order placed successfully',
			order_id: orderId,
			total,
			delivery_mode: delivery_mode || 'Normal',
		});
	} catch (err) {
		await logError(c.env, 'order_place_failed', {
			user_id: c.get('user_id'),
			message: err?.message ?? 'Unknown error',
			stack: err?.stack ?? null,
		});
		return c.json({ error: err.message }, 500);
	}
}
