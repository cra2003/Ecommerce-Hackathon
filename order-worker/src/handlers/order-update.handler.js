import { getOrderUserId, updateOrder } from '../services/order.service.js';
import { invalidateCache } from '../services/cache.service.js';
import { logEvent, logError } from '../services/log.service.js';

// ================= 4️⃣ UPDATE ORDER (ADMIN) =================
export async function updateOrderHandler(c) {
	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Updating order');
		}
		const id = c.req.param('id');
		const { status, address } = await c.req.json();
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Order ID: ${id}, Status: ${status || 'unchanged'}`);
		}
		// Fetch user_id for cache invalidation
		const existing = await getOrderUserId(c.env.DB, id);
		await updateOrder(c.env.DB, id, status, address);
		// Invalidate all users' orders cache is not feasible without listing keys.
		// Invalidate only the affected user's orders cache key if known.
		if (existing?.user_id) {
			await invalidateCache(c, [`orders:${existing.user_id}`]);
		}
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Order updated successfully: ${id}`);
		}
		await logEvent(c.env, 'order_updated', { order_id: Number(id), status, hasAddressUpdate: Boolean(address) });
		return c.json({ message: 'Order updated successfully' });
	} catch (err) {
		await logError(c.env, 'order_update_failed', {
			order_id: Number(c.req.param('id')),
			message: err?.message ?? 'Unknown error',
			stack: err?.stack ?? null,
		});
		return c.json({ error: err.message }, 500);
	}
}
