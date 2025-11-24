export async function healthHandler(c) {
	const checks = {
		status: 'healthy',
		service: 'products-worker',
		timestamp: new Date().toISOString(),
		bindings: {}
	};

	// Check D1 Database
	try {
		const result = await c.env.DB.prepare('SELECT 1 as test').first();
		checks.bindings.DB = { status: 'ok', test: result?.test === 1 };
	} catch (err) {
		checks.bindings.DB = { status: 'error', error: err.message };
		checks.status = 'degraded';
	}

	// Check KV Cache (product-cache)
	const cacheBinding = c.env?.['product-cache'] || c.env?.PRODUCT_CACHE || c.env?.CACHE || null;
	if (cacheBinding) {
		try {
			const testKey = `health-check-${Date.now()}`;
			await cacheBinding.put(testKey, 'test', { expirationTtl: 1 });
			const value = await cacheBinding.get(testKey);
			await cacheBinding.delete(testKey);
			checks.bindings['product-cache'] = { status: 'ok', test: value === 'test' };
		} catch (err) {
			checks.bindings['product-cache'] = { status: 'error', error: err.message };
			checks.status = 'degraded';
		}
	} else {
		checks.bindings['product-cache'] = { status: 'not_configured' };
	}

	// Check R2 Logs
	if (c.env.LOGS) {
		try {
			const testKey = `health-check-${Date.now()}.txt`;
			await c.env.LOGS.put(testKey, 'health check');
			await c.env.LOGS.delete(testKey);
			checks.bindings.LOGS = { status: 'ok' };
		} catch (err) {
			checks.bindings.LOGS = { status: 'error', error: err.message };
			checks.status = 'degraded';
		}
	} else {
		checks.bindings.LOGS = { status: 'not_configured' };
	}

	// Check R2 Product Images
	if (c.env.PRODUCT_IMAGES) {
		try {
			const testKey = `health-check-${Date.now()}.txt`;
			await c.env.PRODUCT_IMAGES.put(testKey, 'health check');
			await c.env.PRODUCT_IMAGES.delete(testKey);
			checks.bindings.PRODUCT_IMAGES = { status: 'ok' };
		} catch (err) {
			checks.bindings.PRODUCT_IMAGES = { status: 'error', error: err.message };
			checks.status = 'degraded';
		}
	} else {
		checks.bindings.PRODUCT_IMAGES = { status: 'not_configured' };
	}

	const statusCode = checks.status === 'healthy' ? 200 : 503;
	return c.json(checks, statusCode);
}

