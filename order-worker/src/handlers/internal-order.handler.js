import { insertOrder } from '../services/order.service.js';
import { invalidateCache } from '../services/cache.service.js';
import { logEvent, logError } from '../services/log.service.js';

// ================= 0️⃣ INTERNAL: CREATE ORDER (called by cart-worker) =================
// Path chosen under /internal to discourage public use; expect service binding calls
export async function internalOrderCreateHandler(c) {
	try {
		if (c.req.addTraceLog) {
			c.req.addTraceLog('Creating internal order');
		}
		// NOTE: This endpoint is intended to be called via a service binding from cart-worker.
		// If you want to harden security, add a shared secret header check here.
		const body = await c.req.json();
		const {
			order_id,
			user_id,
			guest_session_id,
			products,
			address,
			delivery_mode,
			delivery_tier,
			subtotal,
			delivery_cost,
			tax,
			total,
			status = 'pending',
			payment_status = 'pending',
			estimated_delivery_date,
		} = body || {};

		// Validate: either user_id OR guest_session_id must be present (but not both)
		const hasUser = !!user_id;
		const hasGuest = !!guest_session_id;

		if (!order_id || !products || !address || !delivery_mode || !delivery_tier || total == null) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Validation failed: Missing required fields');
			}
			return c.json({ success: false, error: 'Missing required fields' }, 400);
		}

		if (!hasUser && !hasGuest) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Validation failed: Missing user_id or guest_session_id');
			}
			return c.json({ success: false, error: 'Missing required fields: user_id or guest_session_id required' }, 400);
		}

		if (hasUser && hasGuest) {
			if (c.req.addTraceLog) {
				c.req.addTraceLog('Validation failed: Cannot have both user_id and guest_session_id');
			}
			return c.json({ success: false, error: 'Invalid request: cannot have both user_id and guest_session_id' }, 400);
		}

		await logEvent(c.env, 'internal_order_create_attempt', {
			order_id,
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			total,
			delivery_mode,
		});

		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Inserting order: ${order_id}, Total: ${total}, Mode: ${delivery_mode}`);
		}
		await insertOrder(c.env.DB, {
			order_id,
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			products,
			address,
			delivery_mode,
			delivery_tier,
			subtotal,
			delivery_cost,
			tax,
			total,
			status,
			payment_status,
			estimated_delivery_date,
		});

		// Invalidate cache for user or guest
		if (user_id) {
			await invalidateCache(c, [`orders:${user_id}`]);
		}
		if (c.req.addTraceLog) {
			c.req.addTraceLog(`Order created successfully: ${order_id}`);
		}

		await logEvent(c.env, 'internal_order_created', {
			order_id,
			user_id: user_id || null,
			guest_session_id: guest_session_id || null,
			total,
		});

		return c.json({ success: true, order_id });
	} catch (err) {
		await logError(c.env, 'internal_order_create_failed', {
			message: err?.message ?? 'Unknown error',
			stack: err?.stack ?? null,
		});
		return c.json({ success: false, error: err.message || 'Failed to create order' }, 500);
	}
}
