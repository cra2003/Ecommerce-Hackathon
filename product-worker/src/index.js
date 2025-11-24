import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { instrument } from '@microlabs/otel-cf-workers'
import loggingMiddleware from './middleware/logging.middleware.js'
import { registerProductRoutes } from './routes/products.routes.js'
import { registerHealthRoutes } from './routes/health.routes.js'

const app = new Hono()

// CORS configuration - expose CF-Ray header so it's visible in browser
// Cloudflare automatically adds CF-Ray to responses, we just need to expose it via CORS
app.use('*', cors({
	exposeHeaders: ['cf-ray', 'CF-Ray', 'cf-request-id', 'x-cf-ray'],
	allowHeaders: ['*'],
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	origin: '*',
}))

app.use('*', loggingMiddleware)

registerProductRoutes(app)
registerHealthRoutes(app)

app.get('/', (c) => c.text('Product API running successfully'))

// OpenTelemetry configuration
/**
 * @param {any} env - Environment variables
 * @param {any} _trigger - Trigger context
 * @returns {import('@microlabs/otel-cf-workers').TraceConfig}
 */
const config = (env, _trigger) => {
	// Check if API key is available and not empty
	const apiKey = env.OTEL_INGEST_API_KEY
	if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
		console.warn('[OTEL] OTEL_INGEST_API_KEY not found or empty, tracing disabled for products-worker')
		return null // Disable tracing if no API key
	}
	
	// Determine the endpoint based on environment or default to Honeycomb
	// For Grafana Cloud: https://otlp-gateway-<region>.grafana.net/otlp
	// For Honeycomb: https://api.honeycomb.io/v1/traces
	// For other providers, set OTEL_EXPORTER_OTLP_ENDPOINT in secrets
	const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://api.honeycomb.io/v1/traces'
	
	// Build headers based on provider
	const headers = {}
	
	if (endpoint.includes('honeycomb.io')) {
		// Honeycomb format - X-Honeycomb-Team header with API key
		headers['X-Honeycomb-Team'] = apiKey.trim()
		// Optional: Set dataset if provided
		if (env.OTEL_DATASET) {
			headers['X-Honeycomb-Dataset'] = env.OTEL_DATASET
		}
	} else if (endpoint.includes('grafana.net')) {
		// Grafana Cloud format
		headers['Authorization'] = `Basic ${apiKey.trim()}`
	} else {
		// Generic OTLP endpoint
		headers['Authorization'] = `Bearer ${apiKey.trim()}`
	}
	
	console.log('[OTEL] Tracing enabled for products-worker')
	console.log('[OTEL] Endpoint:', endpoint)
	console.log('[OTEL] API key present:', apiKey ? `Yes (length: ${apiKey.length})` : 'No')
	
	return {
		exporter: {
			url: endpoint,
			headers: headers,
		},
		service: {
			name: 'products-worker',
			version: '1.0.0',
		},
		instrumentation: {
			enableFetchInstrumentation: true,
		},
	}
}

// Wrap the Hono app with OpenTelemetry instrumentation
const handler = {
	async fetch(request, env, ctx) {
		return app.fetch(request, env, ctx)
	},
}

export default instrument(handler, config)
