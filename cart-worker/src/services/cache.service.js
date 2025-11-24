// =============== CACHE HELPERS ==================
export async function getCached(c, key) {
	const cached = await c.env.CACHE.get(key, 'json');
	if (cached) console.log(`⚡ Cache hit: ${key}`);
	return cached;
}

export async function setCached(c, key, data, ttl = 300) {
	await c.env.CACHE.put(key, JSON.stringify(data), { expirationTtl: ttl });
	console.log(`💾 Cache stored: ${key}`);
}

export async function invalidateCache(c, keys = []) {
	for (const key of keys) {
		await c.env.CACHE.delete(key);
		console.log(`🧹 Cache invalidated: ${key}`);
	}
}
