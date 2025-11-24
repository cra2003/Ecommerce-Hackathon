export async function healthHandler(c) {
  const checks = {
    status: 'healthy',
    service: 'fulfillment-worker',
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

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  return c.json(checks, statusCode);
}

export function rootHandler(c) {
  return c.json({
    service: 'fulfillment-worker',
    status: 'online',
    version: '1.0.0',
    endpoints: [
      'GET /api/stock/:product_id/:size',
      'GET /api/stock/product/:product_id',
      'POST /api/fulfillment/check',
      'POST /api/stock/deduct',
      'POST /api/stock/restore'
    ]
  });
}

