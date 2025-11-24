export async function healthHandler(c) {
  const checks = {
    status: 'healthy',
    service: 'order-worker',
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
  return c.text('Orders API running successfully ✅')
}

