import { getOrderByIdAndUser, getOrderItemsWithProducts } from '../services/order.service.js';
import { logEvent, logError } from '../services/log.service.js';

// ================= 3️⃣ GET SINGLE ORDER =================
export async function getOrderHandler(c) {
	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Fetching single order');
		}
		const user_id = c.get('user_id');
		const id = c.req.param('id');
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Order ID: ${id}`);
		}

		const order = await getOrderByIdAndUser(c.env.DB, id, user_id);

		if (!order) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Order not found');
			}
			return c.json({ error: 'Order not found' }, 404);
		}

		const items = await getOrderItemsWithProducts(c.env.DB, id);
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Order retrieved: ${items?.length || 0} item(s)`);
		}

		await logEvent(c.env, 'order_viewed', { user_id, order_id: Number(id) });
		return c.json({ order, items: items || [] });
	} catch (err) {
		await logError(c.env, 'order_view_failed', {
			user_id: c.get('user_id'),
			order_id: Number(c.req.param('id')),
			message: err?.message ?? 'Unknown error',
			stack: err?.stack ?? null,
		});
		return c.json({ error: err.message }, 500);
	}
}
