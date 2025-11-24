// Helper to get the cache binding - handles both "CACHE" and "product-cache" binding names
function getCacheBinding(c) {
	// Try different possible binding names (Cloudflare converts hyphens to underscores)
	return c.env?.['product-cache'] || c.env?.PRODUCT_CACHE || c.env?.CACHE || null;
}

export async function getCached(c, key) {
	// Defensive check - ensure cache binding exists and has the get method
	const cacheBinding = getCacheBinding(c);
	if (!cacheBinding || typeof cacheBinding.get !== 'function') {
		console.log('[cache] Cache binding not available or invalid');
		return null;
	}
	
	try {
		const cached = await cacheBinding.get(key, 'json');
		if (cached) {
			console.log(`⚡ Cache hit: ${key}`);
			return cached;
		}
		return null;
	} catch (error) {
		console.error('[cache] Error reading from cache:', error);
		return null;
	}
}
  
export async function setCached(c, key, data, ttl = 300) {
	// Defensive check - ensure cache binding exists and has the put method
	const cacheBinding = getCacheBinding(c);
	if (!cacheBinding || typeof cacheBinding.put !== 'function') {
		console.log('[cache] Cache binding not available or invalid, skipping cache write');
		return;
	}
	
	try {
		await cacheBinding.put(key, JSON.stringify(data), { expirationTtl: ttl });
		console.log(`💾 Cache stored: ${key} (TTL: ${ttl}s)`);
	} catch (error) {
		console.error('[cache] Error writing to cache:', error);
		// Don't throw - caching is best effort
	}
}

export async function invalidateCache(c, keys = []) {
	// Defensive check - ensure cache binding exists and has the delete method
	const cacheBinding = getCacheBinding(c);
	if (!cacheBinding || typeof cacheBinding.delete !== 'function') {
		return;
	}
	
	for (const key of keys) {
		try {
			await cacheBinding.delete(key);
			console.log(`🧹 Cache invalidated: ${key}`);
		} catch (error) {
			console.error(`[cache] Error invalidating cache key ${key}:`, error);
		}
	}
}

