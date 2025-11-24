import { getUserOrders } from '../services/order.service.js';
import { getCached, setCached } from '../services/cache.service.js';
import { logEvent, logError } from '../services/log.service.js';

// ================= 2️⃣ GET USER ORDERS =================
export async function listOrdersHandler(c) {
  try {
    const user_id = c.get('user_id')
    console.log('[GET /orders] user_id from context:', user_id)
    
    if (!user_id) {
      console.error('[GET /orders] user_id is missing from context')
      return c.json({ error: 'User ID not found in request context' }, 401)
    }
    
    const cacheKey = `orders:${user_id}`
    console.log('[GET /orders] Cache key:', cacheKey)

    // Try cache first
    const cached = await getCached(c, cacheKey)
    if (cached) {
      console.log('[GET /orders] Cache hit, returning cached orders')
      await logEvent(c.env, 'orders_listed', { user_id, source: 'cache', count: cached.orders?.length ?? 0 })
      return c.json(cached)
    }

    console.log('[GET /orders] Querying database for user_id:', user_id)
    const orders = await getUserOrders(c.env.DB, user_id)

    console.log('[GET /orders] Database query result:', orders.length || 0, 'orders found')
    const payload = { orders: orders || [] }
    await setCached(c, cacheKey, payload, 180)
    await logEvent(c.env, 'orders_listed', { user_id, source: 'database', count: orders.length || 0 })
    return c.json(payload)
  } catch (err) {
    console.error('[GET /orders] Error:', err.message, err.stack)
    await logError(c.env, 'orders_list_failed', {
      user_id: c.get('user_id'),
      message: err?.message ?? 'Unknown error',
      stack: err?.stack ?? null,
    })
    return c.json({ error: err.message, details: err.stack }, 500)
  }
}

