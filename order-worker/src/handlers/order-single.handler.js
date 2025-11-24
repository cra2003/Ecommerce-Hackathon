import { getOrderByIdAndUser, getOrderItemsWithProducts } from '../services/order.service.js';
import { logEvent, logError } from '../services/log.service.js';

// ================= 3️⃣ GET SINGLE ORDER =================
export async function getOrderHandler(c) {
	try {
		const user_id = c.get('user_id');
		const id = c.req.param('id');

		const order = await getOrderByIdAndUser(c.env.DB, id, user_id);

		if (!order) return c.json({ error: 'Order not found' }, 404);

		const items = await getOrderItemsWithProducts(c.env.DB, id);

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
