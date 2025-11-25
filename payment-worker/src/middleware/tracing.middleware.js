import { trace } from '@opentelemetry/api';

/**
 * Middleware to add Cloudflare Ray ID (cf-ray) and trace logs as span attributes
 * This ensures every trace includes the cf-ray ID and accumulated logs for correlation
 */
export default async function tracingMiddleware(c, next) {
	// Initialize in-memory log buffer for this request
	c.req.logBuffer = [];

	// Define helper function to add log messages
	// Messages are pushed to buffer and also logged to console
	c.req.addTraceLog = (message) => {
		if (typeof message !== 'string') {
			message = String(message);
		}
		c.req.logBuffer.push(message);
		console.log(`[TraceLog] ${message}`);
	};

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

	// Execute the request
	await next();

	// After request completes, attach accumulated logs to the root span
	// Use the same active span (which should be the root span)
	const finalSpan = trace.getActiveSpan();

	if (finalSpan && c.req.logBuffer.length > 0) {
		try {
			// Convert log buffer to JSON string and set as attribute
			const logsJson = JSON.stringify(c.req.logBuffer);
			finalSpan.setAttribute('Logs', logsJson);
			console.log(`[TraceLog] ✅ Attached ${c.req.logBuffer.length} log(s) to root span`);
		} catch (err) {
			console.warn('[TraceLog] ⚠️ Failed to attach logs to span:', err.message);
		}
	}
}
