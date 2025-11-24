import { getCacheKey } from '../utils/key.util.js';

/**
 * Get cached price data from KV
 */
export async function getCachedPrice(c, sku, productId = null) {
	// Defensive check - ensure PRICE_CACHE exists and has the get method
	if (!c.env || !c.env.PRICE_CACHE || typeof c.env.PRICE_CACHE.get !== 'function') {
		console.log('[cache] PRICE_CACHE binding not available or invalid');
		return null;
	}

	try {
		const cacheKey = getCacheKey(sku, productId);
		const cached = await c.env.PRICE_CACHE.get(cacheKey, 'json');
		if (cached) {
			console.log(`[cache] Cache hit: ${cacheKey}`);
			return cached;
		}
		console.log(`[cache] Cache miss: ${cacheKey}`);
		return null;
	} catch (error) {
		console.error('[cache] Error reading from cache:', error);
		return null;
	}
}

/**
 * Set price data in KV cache
 * TTL: 5 minutes (300 seconds) - prices don't change frequently but we want fresh data
 */
export async function setCachedPrice(c, sku, productId, priceData, ttl = 300) {
	// Defensive check - ensure PRICE_CACHE exists and has the put method
	if (!c.env || !c.env.PRICE_CACHE || typeof c.env.PRICE_CACHE.put !== 'function') {
		console.log('[cache] PRICE_CACHE binding not available or invalid, skipping cache write');
		return;
	}

	try {
		const cacheKey = getCacheKey(sku, productId);
		await c.env.PRICE_CACHE.put(cacheKey, JSON.stringify(priceData), { expirationTtl: ttl });
		console.log(`[cache] Cached: ${cacheKey} (TTL: ${ttl}s)`);
	} catch (error) {
		console.error('[cache] Error writing to cache:', error);
		// Don't throw - caching is best effort
	}
}

/**
 * Invalidate cache for a specific price
 */
export async function invalidatePriceCache(c, sku, productId = null) {
	// Defensive check - ensure PRICE_CACHE exists and has the delete method
	if (!c.env || !c.env.PRICE_CACHE || typeof c.env.PRICE_CACHE.delete !== 'function') {
		return;
	}

	try {
		const cacheKey = getCacheKey(sku, productId);
		await c.env.PRICE_CACHE.delete(cacheKey);
		console.log(`[cache] Invalidated: ${cacheKey}`);
	} catch (error) {
		console.error('[cache] Error invalidating cache:', error);
	}
}
