import { getOrderUserId, deleteOrder } from '../services/order.service.js';
import { invalidateCache } from '../services/cache.service.js';
import { logEvent, logError } from '../services/log.service.js';

// ================= 5️⃣ DELETE ORDER (User can delete their own orders) =================
export async function deleteOrderHandler(c) {
	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Deleting order');
		}
		const user_id = c.get('user_id');
		const id = c.req.param('id');
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Order ID: ${id}`);
		}

		// Verify order belongs to user
		const existing = await getOrderUserId(c.env.DB, id);
		if (!existing) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Order not found');
			}
			return c.json({ error: 'Order not found' }, 404);
		}
		if (existing.user_id !== user_id) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Unauthorized: Order does not belong to user');
			}
			return c.json({ error: 'Unauthorized: You can only delete your own orders' }, 403);
		}

		// Hard delete the order
		await deleteOrder(c.env.DB, id, user_id);
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Order deleted successfully: ${id}`);
		}

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
