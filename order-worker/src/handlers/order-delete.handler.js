import { getOrderUserId, deleteOrder } from '../services/order.service.js';
import { invalidateCache } from '../services/cache.service.js';
import { logEvent, logError } from '../services/log.service.js';

// ================= 5️⃣ DELETE ORDER (User can delete their own orders) =================
export async function deleteOrderHandler(c) {
	try {
		const user_id = c.get('user_id');
		const id = c.req.param('id');

		// Verify order belongs to user
		const existing = await getOrderUserId(c.env.DB, id);
		if (!existing) {
			return c.json({ error: 'Order not found' }, 404);
		}
		if (existing.user_id !== user_id) {
			return c.json({ error: 'Unauthorized: You can only delete your own orders' }, 403);
		}

		// Hard delete the order
		await deleteOrder(c.env.DB, id, user_id);

		// Invalidate cache
		await invalidateCache(c, [`orders:${user_id}`]);

		await logEvent(c.env, 'order_deleted', { user_id, order_id: id });
		return c.json({ success: true, message: 'Order cancelled and deleted successfully' });
	} catch (err) {
		await logError(c.env, 'order_delete_failed', {
			user_id: c.get('user_id'),
			order_id: c.req.param('id'),
			message: err?.message ?? 'Unknown error',
			stack: err?.stack ?? null,
		});
		return c.json({ error: err.message }, 500);
	}
}
