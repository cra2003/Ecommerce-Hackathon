export async function healthHandler(c) {
	const checks = {
		status: 'healthy',
		service: 'price-worker',
		timestamp: new Date().toISOString(),
		bindings: {},
	};

	// Check D1 Database
	try {
		const result = await c.env.DB.prepare('SELECT 1 as test').first();
		checks.bindings.DB = { status: 'ok', test: result?.test === 1 };
	} catch (err) {
		checks.bindings.DB = { status: 'error', error: err.message };
		checks.status = 'degraded';
	}

	// Check KV Cache (PRICE_CACHE)
	const cacheBinding = c.env?.['PRICE_CACHE'] || c.env?.PRICE_CACHE || null;
	if (cacheBinding) {
		try {
			const testKey = `health-check-${Date.now()}`;
			await cacheBinding.put(testKey, 'test', { expirationTtl: 60 });
			const value = await cacheBinding.get(testKey);
			await cacheBinding.delete(testKey);
			checks.bindings.PRICE_CACHE = { status: 'ok', test: value === 'test' };
		} catch (err) {
			checks.bindings.PRICE_CACHE = { status: 'error', error: err.message };
			checks.status = 'degraded';
		}
	} else {
		checks.bindings.PRICE_CACHE = { status: 'not_configured' };
	}

	const statusCode = checks.status === 'healthy' ? 200 : 503;
	return c.json(checks, statusCode);
}

export function rootHandler(c) {
	return c.json({
		service: 'price-worker',
		status: 'online',
		version: '1.0.0',
		endpoints: ['GET /api/price/:sku', 'GET /api/price?sku=XXX&product_id=YYY'],
	});
}
