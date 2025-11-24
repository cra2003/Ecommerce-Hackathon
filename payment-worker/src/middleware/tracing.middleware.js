import { trace } from '@opentelemetry/api';

/**
 * Middleware to add Cloudflare Ray ID (cf-ray) as a span attribute
 * This ensures every trace includes the cf-ray ID for correlation
 */
export default async function tracingMiddleware(c, next) {
	// Get the current active span from OpenTelemetry
	const activeSpan = trace.getActiveSpan();

	if (activeSpan) {
		// Extract cf-ray from request headers
		// Cloudflare automatically adds cf-ray to requests
		const cfRay = c.req.header('cf-ray') || c.req.header('CF-Ray') || null;

		if (cfRay) {
			// Add cf-ray as a span attribute
			activeSpan.setAttribute('cf-ray', cfRay);
		}

		// Also add request method and path for better trace context
		activeSpan.setAttribute('http.method', c.req.method);
		activeSpan.setAttribute('http.route', c.req.path);
	}

	await next();
}
