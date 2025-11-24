/**
 * Fulfillment Worker
 * Handles inventory, warehouse selection, and delivery cost calculation
 */

import { Hono } from 'hono';
import { instrument } from '@microlabs/otel-cf-workers';
import corsMiddleware from './config/cors.config.js';
import loggingMiddleware from './middleware/logging.middleware.js';
import tracingMiddleware from './middleware/tracing.middleware.js';
import { registerStockRoutes } from './routes/stock.routes.js';
import { registerFulfillmentRoutes } from './routes/fulfillment.routes.js';
import { registerHealthRoutes } from './routes/health.routes.js';

const app = new Hono();

// CORS configuration
app.use('/*', corsMiddleware);

// Add cf-ray to spans
app.use('*', tracingMiddleware);

// Request-level structured logging
app.use('*', loggingMiddleware);

registerStockRoutes(app);
registerFulfillmentRoutes(app);
registerHealthRoutes(app);

// OpenTelemetry configuration
/**
 * @param {any} env - Environment variables
 * @param {any} _trigger - Trigger context
 * @returns {import('@microlabs/otel-cf-workers').TraceConfig}
 */
const config = (env, _trigger) => {
	// Check if API key is available and not empty
	const apiKey = env.OTEL_INGEST_API_KEY;
	if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
		console.warn('[OTEL] OTEL_INGEST_API_KEY not found or empty, tracing disabled for fullfilment-worker');
		return null; // Disable tracing if no API key
	}

	const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://api.honeycomb.io/v1/traces';

	const headers = {};

	if (endpoint.includes('honeycomb.io')) {
		headers['X-Honeycomb-Team'] = apiKey.trim();
		if (env.OTEL_DATASET) {
			headers['X-Honeycomb-Dataset'] = env.OTEL_DATASET;
		}
	} else if (endpoint.includes('grafana.net')) {
		headers['Authorization'] = `Basic ${apiKey.trim()}`;
	} else {
		headers['Authorization'] = `Bearer ${apiKey.trim()}`;
	}

	console.log('[OTEL] Tracing enabled for fullfilment-worker');
	console.log('[OTEL] Endpoint:', endpoint);
	console.log('[OTEL] API key present:', apiKey ? `Yes (length: ${apiKey.length})` : 'No');

	return {
		exporter: {
			url: endpoint,
			headers: headers,
		},
		service: {
			name: 'fullfilment-worker',
			version: '1.0.0',
		},
		instrumentation: {
			enableFetchInstrumentation: true,
		},
	};
};

// Wrap the Hono app with OpenTelemetry instrumentation
const handler = {
	async fetch(request, env, ctx) {
		return app.fetch(request, env, ctx);
	},
};

export default instrument(handler, config);
