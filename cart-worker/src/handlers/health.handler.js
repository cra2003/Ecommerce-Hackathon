export async function healthHandler(c) {
  const checks = {
    status: 'healthy',
    service: 'cart-worker',
    timestamp: new Date().toISOString(),
    bindings: {},
    services: {}
  };

  // Check D1 Database
  try {
    const result = await c.env.DB.prepare('SELECT 1 as test').first();
    checks.bindings.DB = { status: 'ok', test: result?.test === 1 };
  } catch (err) {
    checks.bindings.DB = { status: 'error', error: err.message };
    checks.status = 'degraded';
  }

  // Check KV Cache
  if (c.env.CACHE) {
    try {
      const testKey = `health-check-${Date.now()}`;
      await c.env.CACHE.put(testKey, 'test', { expirationTtl: 1 });
      const value = await c.env.CACHE.get(testKey);
      await c.env.CACHE.delete(testKey);
      checks.bindings.CACHE = { status: 'ok', test: value === 'test' };
    } catch (err) {
      checks.bindings.CACHE = { status: 'error', error: err.message };
      checks.status = 'degraded';
    }
  } else {
    checks.bindings.CACHE = { status: 'not_configured' };
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

  // Check Service Bindings
  const serviceChecks = [
    { name: 'PRODUCTS_SERVICE', binding: c.env.PRODUCTS_SERVICE },
    { name: 'PRICE_SERVICE', binding: c.env.PRICE_SERVICE },
    { name: 'FULFILLMENT_SERVICE', binding: c.env.FULFILLMENT_SERVICE },
    { name: 'ORDER_SERVICE', binding: c.env.ORDER_SERVICE }
  ];

  for (const { name, binding } of serviceChecks) {
    if (binding) {
      try {
        const req = new Request('https://internal/health', { method: 'GET' });
        const res = await binding.fetch(req).catch(() => null);
        if (res && res.ok) {
          checks.services[name] = { status: 'ok', reachable: true };
        } else {
          // Try root endpoint as fallback
          const req2 = new Request('https://internal/', { method: 'GET' });
          const res2 = await binding.fetch(req2).catch(() => null);
          checks.services[name] = { 
            status: res2 && res2.ok ? 'ok' : 'degraded', 
            reachable: !!res2 
          };
        }
      } catch (err) {
        checks.services[name] = { status: 'error', error: err.message };
        checks.status = 'degraded';
      }
    } else {
      checks.services[name] = { status: 'not_configured' };
    }
  }

  // Check secrets
  checks.secrets = {
    JWT_SECRET: !!c.env.JWT_SECRET
  };

  if (!checks.secrets.JWT_SECRET) {
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  return c.json(checks, statusCode);
}

export function rootHandler(c) {
  return c.json({
    service: 'cart-worker',
    status: 'online',
    version: '1.0.0',
    endpoints: [
      'POST /cart/add',
      'GET /cart',
      'POST /cart/sync',
      'DELETE /cart/item',
      'DELETE /cart',
      'POST /cart/verify-stock',
      'POST /cart/shipping',
      'GET /cart/summary',
      'POST /cart/place-order'
    ]
  });
}

