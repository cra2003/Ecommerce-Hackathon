import { logStructured, logError } from '../services/log.service.js';

// Request-level structured logging
export default async function loggingMiddleware(c, next) {
  const requestId = typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  const start = Date.now();
  await logStructured(c.env, 'request_received', {
    requestId,
    method: c.req.method,
    path: c.req.path,
    ray: c.req.header('cf-ray') ?? null,
  });
  try {
    await next();
    await logStructured(c.env, 'request_completed', {
      requestId,
      status: c.res?.status ?? null,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    await logError(c.env, 'request_error', {
      requestId,
      message: err?.message ?? 'Unknown error',
      stack: err?.stack ?? null,
    });
    throw err;
  }
}

