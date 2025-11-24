# OpenTelemetry Tracing Setup - All Workers

OpenTelemetry tracing has been added to all workers using `@microlabs/otel-cf-workers`.

## Workers with Tracing Enabled

✅ **products-worker**  
✅ **price-worker**  
✅ **cart-worker**  
✅ **payment-worker**  
✅ **fullfilment-worker**  
✅ **auth-worker**

## Setting Up Secrets for All Workers

You need to add the OpenTelemetry secrets to **each worker** that you want to trace.

### Required Secrets

1. **OTEL_INGEST_API_KEY** - Your OpenTelemetry ingest API key
2. **OTEL_EXPORTER_OTLP_ENDPOINT** (optional) - Your OTLP endpoint URL

### Quick Setup Script

```bash
# Set your API key (you'll be prompted once)
export OTEL_API_KEY="your-api-key-here"

# Set your endpoint (optional, defaults to Honeycomb)
export OTEL_ENDPOINT="https://api.honeycomb.io/v1/traces"

# Add secrets to all workers
cd price-worker && wrangler secret put OTEL_INGEST_API_KEY <<< "$OTEL_API_KEY" && cd ..
cd cart-worker && wrangler secret put OTEL_INGEST_API_KEY <<< "$OTEL_API_KEY" && cd ..
cd payment-worker && wrangler secret put OTEL_INGEST_API_KEY <<< "$OTEL_API_KEY" && cd ..
cd fullfilment-worker && wrangler secret put OTEL_INGEST_API_KEY <<< "$OTEL_API_KEY" && cd ..
cd auth-worker && wrangler secret put OTEL_INGEST_API_KEY <<< "$OTEL_API_KEY" && cd ..
cd product-worker && wrangler secret put OTEL_INGEST_API_KEY <<< "$OTEL_API_KEY" && cd ..

# Optional: Add custom endpoint to all workers
if [ ! -z "$OTEL_ENDPOINT" ]; then
  cd price-worker && wrangler secret put OTEL_EXPORTER_OTLP_ENDPOINT <<< "$OTEL_ENDPOINT" && cd ..
  cd cart-worker && wrangler secret put OTEL_EXPORTER_OTLP_ENDPOINT <<< "$OTEL_ENDPOINT" && cd ..
  cd payment-worker && wrangler secret put OTEL_EXPORTER_OTLP_ENDPOINT <<< "$OTEL_ENDPOINT" && cd ..
  cd fullfilment-worker && wrangler secret put OTEL_EXPORTER_OTLP_ENDPOINT <<< "$OTEL_ENDPOINT" && cd ..
  cd auth-worker && wrangler secret put OTEL_EXPORTER_OTLP_ENDPOINT <<< "$OTEL_ENDPOINT" && cd ..
  cd product-worker && wrangler secret put OTEL_EXPORTER_OTLP_ENDPOINT <<< "$OTEL_ENDPOINT" && cd ..
fi
```

### Manual Setup (Recommended)

#### Option 1: Using Wrangler CLI

For each worker, run:

```bash
# Example for price-worker
cd price-worker
wrangler secret put OTEL_INGEST_API_KEY
# Paste your API key when prompted

# Optional: Add custom endpoint
wrangler secret put OTEL_EXPORTER_OTLP_ENDPOINT
# Paste your endpoint URL when prompted
```

Repeat for:
- `cart-worker`
- `payment-worker`
- `fullfilment-worker`
- `auth-worker`
- `product-worker`

#### Option 2: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. For each worker:
   - Click on the worker name
   - Go to **Settings** → **Variables and Secrets**
   - Under **Secrets**, click **Add secret**
   - Add:
     - Name: `OTEL_INGEST_API_KEY`
     - Value: Your ingest API key
   - (Optional) Add:
     - Name: `OTEL_EXPORTER_OTLP_ENDPOINT`
     - Value: Your OTLP endpoint URL

### Provider-Specific Endpoints

#### Honeycomb (Default)
- Endpoint: `https://api.honeycomb.io/v1/traces`
- Header: `X-Honeycomb-Team` (contains API key)
- Set only `OTEL_INGEST_API_KEY`

#### Grafana Cloud
- Endpoint: `https://otlp-gateway-<region>.grafana.net/otlp`
- Header: `Authorization: Basic <base64-encoded-api-key>`
- Set both:
  - `OTEL_INGEST_API_KEY` = Your Grafana API key
  - `OTEL_EXPORTER_OTLP_ENDPOINT` = Your Grafana OTLP endpoint

#### Generic OTLP Endpoint
- Header: `Authorization: Bearer <api-key>`
- Set both:
  - `OTEL_INGEST_API_KEY` = Your API key
  - `OTEL_EXPORTER_OTLP_ENDPOINT` = Your OTLP endpoint URL

## Service Names

Each worker is traced with its specific service name:

- `products-worker` → Service: `products-worker`
- `price-worker` → Service: `price-worker`
- `cart-worker` → Service: `cart-worker`
- `payment-worker` → Service: `payment-worker`
- `fullfilment-worker` → Service: `fullfilment-worker`
- `auth-worker` → Service: `auth-worker`

## What Gets Traced

All workers automatically trace:
- ✅ All HTTP requests and responses
- ✅ Fetch calls (service-to-service communication)
- ✅ Service name and version
- ✅ Request timing and duration

## Deployment

After adding secrets, deploy each worker:

```bash
# Deploy all workers
cd price-worker && npm run deploy && cd ..
cd cart-worker && npm run deploy && cd ..
cd payment-worker && npm run deploy && cd ..
cd fullfilment-worker && npm run deploy && cd ..
cd auth-worker && npm run deploy && cd ..
cd product-worker && npm run deploy && cd ..
```

Traces should start appearing in your observability platform within a few minutes.

## Verification

To verify tracing is working:

1. Make requests to your workers
2. Check your observability platform (Honeycomb, Grafana, etc.)
3. You should see traces with:
   - Service names matching each worker
   - Request paths and methods
   - Timing information
   - Distributed traces across services

## Troubleshooting

If traces aren't appearing:

1. **Check secrets are set**: Verify `OTEL_INGEST_API_KEY` is set for each worker
2. **Check endpoint**: Verify endpoint URL is correct for your provider
3. **Check deployment**: Make sure you've deployed after adding secrets
4. **Check logs**: Use `wrangler tail` to see if there are any errors
5. **Check provider dashboard**: Verify your API key is valid and has permissions

## Local Development

For local development, create `.dev.vars` in each worker directory:

```bash
OTEL_INGEST_API_KEY=your-api-key-here
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io/v1/traces
```

**Note:** Don't commit `.dev.vars` to git (it's already in `.gitignore`).

